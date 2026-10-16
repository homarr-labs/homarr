import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { RPCHandler } from "@orpc/server/fetch";
import { afterEach, expect, test, vi } from "vitest";
import { WebSocketServer } from "ws";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import { decryptSecret, encryptSecret } from "@homarr/common/server";
import { eq } from "@homarr/db";
import {
  federationConnections,
  integrationSecrets,
  integrations,
  integrationUserPermissions,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import { createWorkerConnection, generateWorkerIdentity, getWorkerId } from "@homarr/remote-protocol";
import type { RemoteTransport } from "@homarr/remote-protocol";

import { ApiError, createApiCaller, createApiRouter, publicProcedure } from "../procedure";
import type { ApiContext } from "../procedure";
import { federationRouter } from "../router/federation";
import { integrationRouter } from "../router/integration/integration-router";
import { statsRouter } from "../router/widgets/stats";
import { callFederatedProcedure, closeFederationConnection } from "./client";
import type { FederationConfiguration } from "./client";

vi.hoisted(() => {
  process.env.HOMARR_STATE_BACKEND = "memory";
});

// The fixture uses the operating system CA roots and no user-installed certificates.
// HTTP, integration providers, native RPC and the encrypted connection remain real.
vi.mock("@homarr/core/infrastructure/certificates", async () => ({
  getAllTrustedCertificatesAsync: async () => (await import("node:tls")).rootCertificates,
  getTrustedCertificateHostnamesAsync: async () => [],
}));

const cleanup: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  for (const dispose of cleanup.splice(0).toReversed()) await dispose();
});

const sourceId = "same-integration-id-on-each-worker";
const serviceUserId = "integration-service";
const grantToken = "source-device-bound-service-grant";
const capability = "source-private-routing-capability";
const primaryRouter = createApiRouter({ federation: federationRouter, widget: { stats: statsRouter } });

function createPrimary() {
  const db = createDb();
  cleanup.push(() => {
    db.$client.close();
  });
  const session: Session = {
    user: { id: "primary-owner", permissions: ["integration-full-all"], colorScheme: "dark" },
    expires: "2099-01-01",
  };
  const context: ApiContext = { db, session, deviceType: undefined, baseUrl: "https://primary.example.test" };
  return { db, context, caller: createApiCaller(primaryRouter, context) };
}

async function createSource(name: string, counters = { reads: { first: 12, second: 5 }, unreads: { first: 23 } }) {
  const db = createDb();
  const secret = `${name}-credential-that-never-leaves-source`;
  const upstreamRequests: Array<{ path?: string; token?: string | string[] }> = [];
  const upstream = createServer((request, response) => {
    upstreamRequests.push({ path: request.url, token: request.headers["x-auth-token"] });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(counters));
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  await db.insert(users).values({ id: serviceUserId });
  await db.insert(integrations).values([
    { id: sourceId, name, kind: "miniflux", url: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}` },
    {
      id: "unapproved-integration",
      name: "Source private integration",
      kind: "miniflux",
      url: "https://private.invalid",
    },
  ]);
  await db.insert(integrationSecrets).values({ integrationId: sourceId, kind: "apiKey", value: encryptSecret(secret) });
  await db
    .insert(integrationUserPermissions)
    .values({ integrationId: sourceId, userId: serviceUserId, permission: "use" });
  const identity = await generateWorkerIdentity();
  const workerId = await getWorkerId(identity.publicJwk);
  let approvedDevice: JsonWebKey | undefined;
  let revoked = false;
  const authorizeDevice = vi.fn(async (credential: unknown, device: { devicePublicJwk: JsonWebKey }) => {
    expect(credential).toEqual({ kind: "grant", token: grantToken });
    expect(device.devicePublicJwk).toEqual(approvedDevice);
    if (revoked) throw new Error("Source authorization revoked");
    return {
      grant: {
        role: "service",
        expiresAt: Date.now() + 86_400_000,
        service: { access: "query", integrationIds: [sourceId] },
      },
    };
  });
  const streamCancelled = vi.fn();
  const sourceRouter = createApiRouter({
    integration: integrationRouter,
    widget: { stats: statsRouter },
    diagnostic: {
      stream: publicProcedure.input(z.object({ integrationId: z.string() })).subscription(async function* ({ signal }) {
        try {
          let counter = 0;
          for (;;) {
            if (signal?.aborted) return;
            yield { counter: counter++ };
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        } finally {
          streamCancelled();
        }
      }),
    },
  });
  const paths = ["integration.all", "widget.stats.catalog", "widget.stats.displaySnapshot", "diagnostic.stream"];
  const requests: Array<{ path: string; integrationIds?: string[] }> = [];
  const sourceContext: ApiContext = {
    db,
    session: { user: { id: serviceUserId, permissions: [], colorScheme: "dark" }, expires: "2099-01-01" },
    deviceType: undefined,
    workerAccess: {
      role: "service",
      grantId: "source-service-grant-id",
      workerId,
      service: {
        integrationIds: [sourceId],
        access: "query",
        procedurePaths: paths,
        audience: "https://primary.example.test",
        principalId: "primary-service",
        purpose: "federation",
      },
      authorizeProcedure(request) {
        requests.push(request);
        if (revoked || !paths.includes(request.path) || request.integrationIds?.some((id) => id !== sourceId))
          throw new ApiError({ code: "FORBIDDEN", message: "Source service scope rejected this request" });
      },
    },
  };
  const rpc = new RPCHandler(sourceRouter);
  const sockets = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await new Promise<void>((resolve) => sockets.once("listening", resolve));
  const frames: string[] = [];
  const connections: Array<{ close(): void }> = [];
  sockets.on("connection", (socket) => {
    socket.once("message", (bytes) => {
      const admission = JSON.parse(String(bytes)) as { type: string; capability: string };
      if (admission.type !== "connect" || admission.capability !== capability) return socket.close();
      const transport: RemoteTransport = {
        send(frame) {
          frames.push(frame);
          socket.send(frame);
        },
        subscribe(listener) {
          const receive = (frame: unknown) => {
            frames.push(String(frame));
            listener(String(frame));
          };
          socket.on("message", receive);
          return () => {
            socket.off("message", receive);
          };
        },
        onClose(listener) {
          socket.on("close", listener);
          return () => {
            socket.off("close", listener);
          };
        },
        close: () => socket.close(),
      };
      void createWorkerConnection({
        identity,
        transport,
        authorize: authorizeDevice,
        onRequest: async (request) => {
          const result = await rpc.handle(request, { prefix: "/rpc", context: sourceContext });
          if (!result.matched) return new Response(null, { status: 404 });
          return result.response;
        },
      })
        .then((connection) => connections.push(connection))
        .catch(() => socket.close());
      socket.send(JSON.stringify({ type: "connected" }));
    });
  });
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    for (const connection of connections) connection.close();
    for (const socket of sockets.clients) socket.terminate();
    await new Promise<void>((resolve) => sockets.close(() => resolve()));
    await new Promise<void>((resolve, reject) =>
      upstream.close((error) => {
        if (error) reject(error);
        else resolve();
      }),
    );
    db.$client.close();
  };
  cleanup.push(stop);
  return {
    name,
    workerId,
    identity,
    frames,
    requests,
    secret,
    upstreamRequests,
    authorizeDevice,
    streamCancelled,
    stop,
    address: `http://127.0.0.1:${(sockets.address() as AddressInfo).port}`,
    approveDevice: (device: JsonWebKey) => {
      approvedDevice = device;
    },
    revoke: () => {
      revoked = true;
    },
  };
}

async function prepare(primary: ReturnType<typeof createPrimary>, source: Awaited<ReturnType<typeof createSource>>) {
  const prepared = await primary.caller.federation.prepareConnection({
    workerId: source.workerId,
    publicKey: { ...source.identity.publicJwk },
    name: "Secondary worker",
    mode: "direct",
    address: source.address,
    capability,
  });
  cleanup.push(() => closeFederationConnection(prepared.connectionId));
  source.approveDevice(prepared.devicePublicJwk);
  return prepared;
}

test("primary imports source metadata and reads native statistics over a pinned encrypted connection", async () => {
  const primary = createPrimary();
  await primary.db.insert(users).values({ id: "primary-owner" });
  const source = await createSource("Private source feeds");
  const prepared = await prepare(primary, source);
  const stored = await primary.db.query.federationConnections.findFirst();
  expect(stored?.enabled).toBe(false);
  expect(stored?.encryptedConfiguration).not.toContain(source.address);
  expect(stored?.encryptedConfiguration).not.toContain("devicePrivateJwk");
  const config = JSON.parse(
    decryptSecret(stored?.encryptedConfiguration as `${string}.${string}`),
  ) as FederationConfiguration;
  expect(config.devicePrivateJwk.d).toBeTruthy();
  expect(config.grantToken).toBeUndefined();
  expect(prepared).not.toHaveProperty("devicePrivateJwk");
  await expect(
    primary.caller.federation.authorizeConnection({ connectionId: prepared.connectionId, grantToken }),
  ).resolves.toEqual({ connectionId: prepared.connectionId, enabled: true });
  expect(source.authorizeDevice).toHaveBeenCalledOnce();
  const catalog = await primary.caller.federation.catalog({ connectionId: prepared.connectionId });
  expect(catalog).toEqual([
    {
      id: sourceId,
      name: "Private source feeds",
      kind: "miniflux",
      permissions: { hasUseAccess: true, hasInteractAccess: false, hasFullAccess: false },
    },
  ]);
  expect(JSON.stringify(catalog)).not.toContain(source.secret);
  expect(JSON.stringify(catalog)).not.toContain("127.0.0.1");
  const aliases = await primary.caller.federation.importIntegrations({
    connectionId: prepared.connectionId,
    integrationIds: [sourceId],
  });
  const alias = aliases[0];
  expect(alias).toBeDefined();
  if (!alias) throw new Error("Source integration was not imported");
  expect(alias.id).not.toBe(sourceId);
  expect(await primary.db.query.integrationSecrets.findMany()).toEqual([]);
  const available = await createApiCaller(integrationRouter, primary.context).all();
  expect(available.find(({ id }) => id === alias.id)?.permissions).toEqual({
    hasUseAccess: true,
    hasInteractAccess: false,
    hasFullAccess: false,
  });
  expect(await primary.db.query.integrations.findFirst()).toMatchObject({
    id: alias.id,
    url: "https://worker.invalid",
  });
  await primary.db.update(integrations).set({ name: "Primary alias only" }).where(eq(integrations.id, alias.id));
  await expect(primary.caller.widget.stats.catalog({ integrationId: alias.id })).resolves.toMatchObject({
    name: "Private source feeds",
  });
  await expect(primary.caller.widget.stats.displaySnapshot({ integrationId: alias.id })).resolves.toMatchObject({
    values: { read: 17, unread: 23 },
    error: false,
    stale: false,
  });
  expect(source.upstreamRequests).toEqual([{ path: "/v1/feeds/counters", token: source.secret }]);
  expect(source.requests).toContainEqual(
    expect.objectContaining({ path: "widget.stats.displaySnapshot", integrationIds: [sourceId] }),
  );
  const transcript = source.frames.join("\n");
  for (const privateValue of [
    source.secret,
    grantToken,
    "/v1/feeds/counters",
    "Private source feeds",
    config.devicePrivateJwk.d ?? "missing",
  ])
    expect(transcript).not.toContain(privateValue);
  source.revoke();
  await expect(primary.caller.widget.stats.displaySnapshot({ integrationId: alias.id })).rejects.toMatchObject({
    code: "BAD_GATEWAY",
  });
  expect(source.upstreamRequests).toHaveLength(1);
});

test("two independent workers with the same integration ID produce distinct usable aliases", async () => {
  const primary = createPrimary();
  await primary.db.insert(users).values({ id: "primary-owner" });
  const sources = await Promise.all([createSource("Feeds A"), createSource("Feeds B")]);
  const aliases: string[] = [];
  for (const source of sources) {
    const prepared = await prepare(primary, source);
    await primary.caller.federation.authorizeConnection({ connectionId: prepared.connectionId, grantToken });
    const imported = await primary.caller.federation.importIntegrations({
      connectionId: prepared.connectionId,
      integrationIds: [sourceId],
    });
    const alias = imported[0];
    if (!alias) throw new Error("Source alias was not imported");
    aliases.push(alias.id);
    await expect(primary.caller.widget.stats.catalog({ integrationId: alias.id })).resolves.toMatchObject({
      name: source.name,
    });
  }
  expect(new Set(aliases).size).toBe(2);
  const origins = await primary.db.query.integrationOrigins.findMany();
  expect(origins.map((origin) => origin.remoteIntegrationId)).toEqual([sourceId, sourceId]);
  expect(new Set(origins.map((origin) => origin.connectionId)).size).toBe(2);
});

test("a disabled connection cannot return cached native data and stops its active encrypted stream", async () => {
  const primary = createPrimary();
  await primary.db.insert(users).values({ id: "primary-owner" });
  const source = await createSource("Streaming source");
  const prepared = await prepare(primary, source);
  await primary.caller.federation.authorizeConnection({ connectionId: prepared.connectionId, grantToken });
  const stream = (await callFederatedProcedure(primary.context, prepared.connectionId, ["diagnostic", "stream"], {
    integrationId: sourceId,
  })) as AsyncIterable<{ counter: number }>;
  const iterator = stream[Symbol.asyncIterator]();
  await expect(iterator.next()).resolves.toMatchObject({ done: false, value: { counter: 0 } });
  await primary.caller.federation.disable({ connectionId: prepared.connectionId });
  await expect(iterator.next()).rejects.toBeDefined();
  await expect(
    callFederatedProcedure(primary.context, prepared.connectionId, ["widget", "stats", "catalog"], {
      integrationId: sourceId,
    }),
  ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
  await vi.waitFor(() => expect(source.streamCancelled).toHaveBeenCalledOnce());
});

test("a mismatched pinned identity fails approval before the source receives credentials", async () => {
  const primary = createPrimary();
  await primary.db.insert(users).values({ id: "primary-owner" });
  const source = await createSource("Pinned source");
  const prepared = await prepare(primary, source);
  const other = await generateWorkerIdentity();
  await primary.db
    .update(federationConnections)
    .set({ publicKey: JSON.stringify(other.publicJwk) })
    .where(eq(federationConnections.id, prepared.connectionId));
  await expect(
    primary.caller.federation.authorizeConnection({ connectionId: prepared.connectionId, grantToken }),
  ).rejects.toMatchObject({ code: "BAD_GATEWAY" });
  expect(source.authorizeDevice).not.toHaveBeenCalled();
  expect(await primary.db.query.federationConnections.findFirst()).toMatchObject({ enabled: false });
});

test("an offline source leaves approval disabled and returns a bounded connection error", async () => {
  const primary = createPrimary();
  await primary.db.insert(users).values({ id: "primary-owner" });
  const source = await createSource("Offline source");
  const prepared = await prepare(primary, source);
  await source.stop();
  await expect(
    primary.caller.federation.authorizeConnection({ connectionId: prepared.connectionId, grantToken }),
  ).rejects.toMatchObject({
    code: "BAD_GATEWAY",
    message: "Source worker is offline or rejected this connection",
  });
  expect(await primary.db.query.federationConnections.findFirst()).toMatchObject({ enabled: false });
  expect(source.authorizeDevice).not.toHaveBeenCalled();
});
