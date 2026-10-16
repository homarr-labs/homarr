import { RPCLink } from "@orpc/client/fetch";

import { decryptSecret } from "@homarr/common/server";
import { markFederationUnavailable } from "@homarr/auth/server";
import type { VerifiedFederationAuthorization } from "@homarr/auth/server";
import { eq } from "@homarr/db";
import { federationConnections, integrationOrigins } from "@homarr/db/schema";
import { createBrowserConnection, createRelayTransport, importWorkerIdentity } from "@homarr/remote-protocol";
import type { RemoteConnection } from "@homarr/remote-protocol";

import { ApiError } from "../procedure";
import type { ApiContext } from "../procedure";

export interface FederationConfiguration {
  version: 1;
  mode: "relay" | "direct";
  address: string;
  capability: string;
  devicePrivateJwk: JsonWebKey;
  grantToken?: string;
  verifiedAuthorization?: VerifiedFederationAuthorization;
}

type Context = Pick<ApiContext, "db">;
type PoolEntry = { configuration: string; connection: Promise<RemoteConnection>; active: number; lastUsed: number };
const pool = new Map<string, PoolEntry>();
const MAX_CONNECTIONS = 24;

export function closeFederationConnection(connectionId: string) {
  const entry = pool.get(connectionId);
  pool.delete(connectionId);
  if (entry)
    void entry.connection.then(
      (connection) => connection.close(),
      () => {},
    );
}

export async function getFederationOrigin(context: Context, integrationId: string) {
  const origin = await context.db.query.integrationOrigins.findFirst({
    where: eq(integrationOrigins.integrationId, integrationId),
  });
  if (!origin) return null;
  return { connectionId: origin.connectionId, remoteIntegrationId: origin.remoteIntegrationId };
}

export function federationSocketUrl(mode: "relay" | "direct", address: string, workerId: string) {
  const url = new URL(address);
  if (url.username || url.password || url.search || url.hash)
    throw new Error("Connection address must not contain credentials, query, or fragment");
  if (url.protocol === "https:") url.protocol = "wss:";
  if (url.protocol === "http:") url.protocol = "ws:";
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "wss:" && !(url.protocol === "ws:" && loopback))
    throw new Error("Use HTTPS/WSS, or a loopback worker address");
  let suffix = "/remote/connect";
  if (mode === "relay") suffix = `/connect/${encodeURIComponent(workerId)}`;
  url.pathname = url.pathname.replace(/\/$/, "") + suffix;
  return url;
}

async function openConnection(
  workerId: string,
  publicKey: JsonWebKey,
  config: FederationConfiguration,
  onClose: () => void,
) {
  if (!config.grantToken)
    throw new ApiError({ code: "PRECONDITION_FAILED", message: "The source worker has not approved this connection" });
  const deviceIdentity = await importWorkerIdentity(config.devicePrivateJwk);
  let socketUrl = federationSocketUrl(config.mode, config.address, workerId);
  // Operators may route their configured public relay over the Compose network.
  // A browser-supplied address cannot select this override for another relay.
  if (
    config.mode === "relay" &&
    process.env.WORKER_RELAY_CONNECT_URL &&
    process.env.WORKER_RELAY_URL &&
    config.address.replace(/\/$/u, "") === process.env.WORKER_RELAY_URL.replace(/\/$/u, "")
  ) {
    const internal = new URL(process.env.WORKER_RELAY_CONNECT_URL);
    if (
      !["ws:", "wss:"].includes(internal.protocol) ||
      internal.username ||
      internal.password ||
      internal.search ||
      internal.hash
    )
      throw new Error("Invalid operator relay connection URL");
    internal.pathname = `${internal.pathname.replace(/\/$/u, "")}/connect/${encodeURIComponent(workerId)}`;
    socketUrl = internal;
  }
  const socket = new WebSocket(socketUrl);
  socket.addEventListener("close", onClose, { once: true });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => fail(), 12_000);
    function cleanup() {
      clearTimeout(timeout);
      socket.removeEventListener("message", admitted);
      socket.removeEventListener("error", fail);
      socket.removeEventListener("close", fail);
    }
    function fail() {
      cleanup();
      socket.close();
      reject(new ApiError({ code: "BAD_GATEWAY", message: "Source worker is offline or rejected this connection" }));
    }
    function admitted(event: MessageEvent) {
      if (typeof event.data !== "string" || event.data.length > 16_384) return fail();
      try {
        if (JSON.parse(event.data).type !== "connected") return fail();
      } catch {
        return fail();
      }
      cleanup();
      resolve();
    }
    socket.addEventListener("message", admitted);
    socket.addEventListener("error", fail, { once: true });
    socket.addEventListener("close", fail, { once: true });
    socket.addEventListener(
      "open",
      () => socket.send(JSON.stringify({ type: "connect", capability: config.capability })),
      { once: true },
    );
  });
  try {
    const connection = await createBrowserConnection({
      workerId,
      pinnedIdentity: publicKey,
      deviceIdentity,
      credential: { kind: "grant", token: config.grantToken },
      transport: createRelayTransport(socket),
    });
    const authorization = connection.authorization as { grant?: { role?: string } };
    if (authorization.grant?.role !== "service") {
      connection.close();
      throw new ApiError({
        code: "FORBIDDEN",
        message: "Approve a dedicated integration service grant on the source worker",
      });
    }
    return connection;
  } catch (error) {
    socket.close();
    throw error;
  }
}

async function acquire(context: Context, connectionId: string) {
  const row = await context.db.query.federationConnections.findFirst({
    where: eq(federationConnections.id, connectionId),
  });
  if (!row?.enabled)
    throw new ApiError({ code: "BAD_GATEWAY", message: "Source worker connection is disabled or unavailable" });
  let entry = pool.get(connectionId);
  if (entry && entry.configuration !== row.encryptedConfiguration) {
    closeFederationConnection(connectionId);
    entry = undefined;
  }
  if (!entry) {
    for (const [id, existing] of pool)
      if (existing.active === 0 && Date.now() - existing.lastUsed > 60_000) closeFederationConnection(id);
    if (pool.size >= MAX_CONNECTIONS) {
      const idle = [...pool].find(([, value]) => value.active === 0);
      if (!idle)
        throw new ApiError({ code: "TOO_MANY_REQUESTS", message: "Too many active source worker connections" });
      closeFederationConnection(idle[0]);
    }
    const config = JSON.parse(
      decryptSecret(row.encryptedConfiguration as `${string}.${string}`),
    ) as FederationConfiguration;
    const pending: PoolEntry = {
      configuration: row.encryptedConfiguration,
      connection: openConnection(row.workerId, JSON.parse(row.publicKey) as JsonWebKey, config, () => {
        if (pool.get(connectionId) === pending) {
          pool.delete(connectionId);
          markFederationUnavailable(connectionId, true);
        }
      }),
      active: 0,
      lastUsed: Date.now(),
    };
    entry = pending;
    pool.set(connectionId, pending);
  }
  entry.active += 1;
  entry.lastUsed = Date.now();
  const current = entry;
  try {
    return {
      connection: await entry.connection,
      release: () => {
        current.active -= 1;
        current.lastUsed = Date.now();
      },
    };
  } catch (error) {
    current.active -= 1;
    closeFederationConnection(connectionId);
    throw error;
  }
}

export async function callFederatedProcedure(
  context: Context,
  connectionId: string,
  path: string[],
  input: unknown,
  options: { signal?: AbortSignal } = {},
): Promise<unknown> {
  let lease: Awaited<ReturnType<typeof acquire>>;
  try {
    lease = await acquire(context, connectionId);
  } catch (error) {
    markFederationUnavailable(connectionId, true);
    if (error instanceof ApiError) throw error;
    throw new ApiError({ code: "BAD_GATEWAY", message: "Source worker connection could not be authenticated" });
  }
  let streaming = false;
  try {
    const link = new RPCLink({
      url: "/rpc",
      origin: "https://worker.invalid",
      fetch: (url, init) => lease.connection.fetch(url, init),
    });
    const result = await link.call(path, input, { context: {}, signal: options.signal });
    markFederationUnavailable(connectionId, false);
    if (result && typeof result === "object" && Symbol.asyncIterator in result) {
      streaming = true;
      const iterator = (result as AsyncIterable<unknown>)[Symbol.asyncIterator]();
      let released = false;
      function release() {
        if (!released) {
          released = true;
          lease.release();
        }
      }
      const stream: AsyncIterableIterator<unknown> = {
        [Symbol.asyncIterator]() {
          return this;
        },
        async next() {
          try {
            await assertFederationEnabled(context, connectionId);
            const value = await iterator.next();
            await assertFederationEnabled(context, connectionId);
            if (value.done) release();
            return value;
          } catch (error) {
            release();
            await iterator.return?.();
            throw error;
          }
        },
        async return(value?: unknown) {
          release();
          if (iterator.return) return iterator.return(value);
          return { done: true, value };
        },
        async throw(error?: unknown) {
          release();
          if (iterator.throw) return iterator.throw(error);
          await iterator.return?.();
          throw error;
        },
      };
      return stream;
    }
    await assertFederationEnabled(context, connectionId);
    return result;
  } catch (error) {
    markFederationUnavailable(connectionId, true);
    closeFederationConnection(connectionId);
    if (error instanceof ApiError) throw error;
    // A failed action may have completed remotely; the caller must check state before retrying.
    throw new ApiError({
      code: "BAD_GATEWAY",
      message: "Source worker request failed; check service state before retrying an action",
    });
  } finally {
    if (!streaming) lease.release();
  }
}

/** Read the actual authenticated response, never an unverified token payload. */
export async function readVerifiedFederationAuthorization(
  context: Context,
  connectionId: string,
): Promise<VerifiedFederationAuthorization> {
  const lease = await acquire(context, connectionId);
  try {
    const response = lease.connection.authorization as {
      grant?: { role?: string; expiresAt?: unknown; service?: { access?: unknown; integrationIds?: unknown } };
    };
    const grant = response.grant;
    const scope = grant?.service;
    if (
      grant?.role !== "service" ||
      !scope ||
      !["query", "interact", "full"].includes(String(scope.access)) ||
      !Array.isArray(scope.integrationIds) ||
      scope.integrationIds.length > 1000 ||
      scope.integrationIds.some((id) => typeof id !== "string" || id.length > 128) ||
      !Number.isSafeInteger(grant.expiresAt) ||
      Number(grant.expiresAt) <= Date.now()
    )
      throw new ApiError({
        code: "FORBIDDEN",
        message: "Source worker returned invalid integration service authority",
      });
    return {
      access: scope.access as VerifiedFederationAuthorization["access"],
      integrationIds: scope.integrationIds as string[],
      expiresAt: Number(grant.expiresAt),
    };
  } finally {
    lease.release();
  }
}

async function assertFederationEnabled(context: Context, connectionId: string) {
  const row = await context.db.query.federationConnections.findFirst({
    where: eq(federationConnections.id, connectionId),
    columns: { enabled: true },
  });
  if (!row?.enabled) throw new ApiError({ code: "FORBIDDEN", message: "Source worker connection was disabled" });
}
