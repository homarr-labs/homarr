import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { WebSocketServer } from "ws";
import { RPCHandler } from "@orpc/server/fetch";
import { expect, test } from "vitest";

import type { Session } from "@homarr/auth";
import { encryptSecret } from "@homarr/common/server";
import {
  federationConnections,
  integrationOrigins,
  integrationSecrets,
  integrations,
  integrationUserPermissions,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import {
  createWorkerConnection,
  exportWorkerIdentity,
  generateWorkerIdentity,
  getWorkerId,
} from "@homarr/remote-protocol";
import type { RemoteTransport } from "@homarr/remote-protocol";

import { closeFederationConnection } from "../../../federation/client";
import { createApiRouter } from "../../../procedure";
import { federationSourceProcedures } from "../../custom-widget/federation-source";
import { executeCustomWidgetRequest } from "../../custom-widget/request-executor";
import { resolveCustomWidgetSource } from "../../custom-widget/source-resolver";

test("a primary Custom Widget executes its source query and action through encrypted native RPC", async () => {
  const secret = "source-only-custom-widget-token";
  const sourceId = "integration-on-source";
  const aliasId = "integration-on-primary";
  const connectionId = "custom-widget-encrypted-connection";
  const userId = "custom-widget-federation-user";
  const session = {
    user: { id: userId, permissions: [], colorScheme: "light" },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } satisfies Session;
  const calls: Array<{ url?: string; method?: string; body: string; authorization?: string }> = [];
  const upstream = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    calls.push({
      url: request.url,
      method: request.method,
      body: Buffer.concat(chunks).toString(),
      authorization: request.headers.authorization,
    });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ count: calls.length, echoedCredential: secret }));
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const sourceDb = createDb();
  const primaryDb = createDb();
  for (const db of [sourceDb, primaryDb]) await db.insert(users).values({ id: userId });
  await sourceDb.insert(integrations).values({
    id: sourceId,
    name: "Private source",
    kind: "jellyfin",
    url: `http://127.0.0.1:${(upstream.address() as AddressInfo).port}/private`,
  });
  await sourceDb
    .insert(integrationSecrets)
    .values({ integrationId: sourceId, kind: "apiKey", value: encryptSecret(secret) });
  await sourceDb.insert(integrationUserPermissions).values({ integrationId: sourceId, userId, permission: "full" });
  await primaryDb
    .insert(integrations)
    .values({ id: aliasId, name: "Worker integration", kind: "jellyfin", url: "https://descriptor-only.invalid/" });
  await primaryDb.insert(integrationUserPermissions).values({ integrationId: aliasId, userId, permission: "full" });

  const workerIdentity = await generateWorkerIdentity();
  const clientIdentity = await generateWorkerIdentity();
  const workerId = await getWorkerId(workerIdentity.publicJwk);
  const sourceRouter = createApiRouter({ federation: createApiRouter(federationSourceProcedures) });
  const rpc = new RPCHandler(sourceRouter);
  const sockets = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  await new Promise<void>((resolve) => sockets.once("listening", resolve));
  let authorized = true;
  const frames: string[] = [];
  const connections: Array<{ close(): void }> = [];
  sockets.on("connection", (socket) => {
    socket.once("message", (bytes) => {
      const admission = JSON.parse(String(bytes)) as { type: string; capability: string };
      if (admission.type !== "connect" || admission.capability !== "private-routing-capability") return socket.close();
      const transport: RemoteTransport = {
        send: (frame) => {
          frames.push(frame);
          socket.send(frame);
        },
        subscribe: (listener) => {
          const receive = (value: unknown) => {
            frames.push(String(value));
            listener(String(value));
          };
          socket.on("message", receive);
          return () => {
            socket.off("message", receive);
          };
        },
        onClose: (listener) => {
          socket.on("close", listener);
          return () => {
            socket.off("close", listener);
          };
        },
        close: () => socket.close(),
      };
      void createWorkerConnection({
        identity: workerIdentity,
        transport,
        authorize: async (credential, device) => {
          expect(credential).toEqual({ kind: "grant", token: "source-service-grant" });
          expect(device.devicePublicJwk).toEqual(clientIdentity.publicJwk);
          return { grant: { role: "service" } };
        },
        onRequest: async (request) => {
          if (!authorized) return new Response(null, { status: 403 });
          const result = await rpc.handle(request, {
            prefix: "/rpc",
            context: { db: sourceDb, session, deviceType: undefined },
          });
          if (!result.matched) return new Response(null, { status: 404 });
          return result.response;
        },
      })
        .then((connection) => {
          connections.push(connection);
        })
        .catch(() => socket.close());
      socket.send(JSON.stringify({ type: "connected" }));
    });
  });
  await primaryDb.insert(federationConnections).values({
    id: connectionId,
    workerId,
    name: "Secondary worker",
    publicKey: JSON.stringify(workerIdentity.publicJwk),
    encryptedConfiguration: encryptSecret(
      JSON.stringify({
        version: 1,
        mode: "direct",
        address: `http://127.0.0.1:${(sockets.address() as AddressInfo).port}`,
        capability: "private-routing-capability",
        grantToken: "source-service-grant",
        verifiedAuthorization: { access: "full", integrationIds: [sourceId], expiresAt: Date.now() + 60_000 },
        devicePrivateJwk: await exportWorkerIdentity(clientIdentity),
      }),
    ),
  });
  await primaryDb
    .insert(integrationOrigins)
    .values({ integrationId: aliasId, connectionId, remoteIntegrationId: sourceId });
  try {
    const source = { type: "integration" as const, integrationId: aliasId, integrationKind: "jellyfin" as const };
    const query = await resolveCustomWidgetSource(
      { db: primaryDb, session },
      source,
      { kind: "query", method: "GET", auth: "inherit" },
      () => {
        throw new Error("Source credentials must remain on the secondary");
      },
    );
    const request = {
      ...query,
      method: "GET" as const,
      kind: "query" as const,
      targetUrl: new URL("/Items/Counts?limit=2", query.baseUrl),
      cacheKey: "encrypted-alias-query",
      cacheTtlSeconds: 300,
    };
    const first = await executeCustomWidgetRequest(request);
    expect(first).toMatchObject({ data: { count: 1 } });
    expect(JSON.stringify(first)).not.toContain(secret);
    await expect(executeCustomWidgetRequest(request)).resolves.toMatchObject({ data: { count: 2 } });
    const action = await resolveCustomWidgetSource(
      { db: primaryDb, session },
      source,
      { kind: "action", method: "POST", auth: "inherit" },
      () => [],
    );
    await expect(
      executeCustomWidgetRequest({
        ...action,
        method: "POST",
        kind: "action",
        targetUrl: new URL("/queue/remove", action.baseUrl),
        body: '{"id":7}',
      }),
    ).resolves.toMatchObject({ data: { count: 3 } });
    expect(calls.map(({ url, method, body }) => ({ url, method, body }))).toEqual([
      { url: "/private/Items/Counts?limit=2", method: "GET", body: "" },
      { url: "/private/Items/Counts?limit=2", method: "GET", body: "" },
      { url: "/private/queue/remove", method: "POST", body: '{"id":7}' },
    ]);
    expect(calls.every((call) => call.authorization?.includes(secret))).toBe(true);
    expect(frames.join("\n")).not.toContain(secret);
    expect(frames.join("\n")).not.toContain("Items/Counts");
    authorized = false;
    await expect(executeCustomWidgetRequest(request)).rejects.toMatchObject({ code: "BAD_GATEWAY" });
    expect(calls).toHaveLength(3);
  } finally {
    closeFederationConnection(connectionId);
    for (const connection of connections) connection.close();
    for (const socket of sockets.clients) socket.terminate();
    await new Promise<void>((resolve) => sockets.close(() => resolve()));
    await new Promise<void>((resolve, reject) =>
      upstream.close((error) => {
        if (error) reject(error);
        else resolve();
      }),
    );
  }
});
