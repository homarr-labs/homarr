import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import {
  createBrowserConnection,
  createRelayTransport,
  fromBase64Url,
  generateDeviceIdentity,
  getWorkerId,
  randomSecret,
  signIdentity,
  toBase64Url,
  utf8,
} from "@homarr/remote-protocol";
import type { RemoteConnection, WorkerIdentity } from "@homarr/remote-protocol";
import type { ORPCClient } from "@homarr/api/orpc";
import type { AccessCredential, IssuedGrant } from "@homarr/worker-access";
import type { WorkerState } from "./state";
import type { startWorkerServer } from "./server";
import type { createRelay } from "../../relay/src/relay";
import type * as databaseModule from "@homarr/db";
import type * as databaseSchema from "@homarr/db/schema";
import type * as mediaFunctions from "./media";

const origin = "https://remote.homarr.test";
const publicBoard = "remote-integration-public";
const privateBoard = "remote-integration-private";
const privateMarker = "PRIVATE-WORKER-INTEGRATION-PAYLOAD";
const clients = new Set<RemoteConnection>();
const sockets = new Set<WebSocket>();
const relayFrames: string[] = [];
const cleanupFunctions: (() => void | Promise<void>)[] = [];
let directory: string;
let state: WorkerState;
let runtime: ReturnType<typeof startWorkerServer>;
let relay: ReturnType<typeof createRelay>;
let owner: RemoteConnection;
let ownerIdentity: WorkerIdentity;
let ownerGrant: IssuedGrant;
let claimSecret: string;
let registrationToken: string;
let directUrl: string;
let relayUrl: string;
let dbModule: typeof databaseModule;
let schema: typeof databaseSchema;
let media: typeof mediaFunctions;
let upstream: ReturnType<typeof Bun.serve>;
let imagePath: string;
let imageRequests = 0;
let slowImageStarted = Promise.withResolvers<void>();
let slowImageCancelled = Promise.withResolvers<void>();
const png = Uint8Array.fromBase64(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
);

function guard<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) throw new Error("Expected integration fixture");
  return value;
}
async function until(predicate: () => boolean, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("Timed out waiting for live service state");
    await Bun.sleep(10);
  }
}
function browserSocket(address: string, clientOrigin = origin, capture = false) {
  const Constructor = WebSocket as unknown as new (url: string, options: Bun.WebSocketOptions) => WebSocket;
  const ws = new Constructor(address, { headers: { Origin: clientOrigin } });
  sockets.add(ws);
  const opened = Promise.withResolvers<void>();
  const closed = Promise.withResolvers<CloseEvent>();
  const messages: string[] = [];
  const waiting: ReturnType<typeof Promise.withResolvers<string>>[] = [];
  ws.addEventListener("open", () => opened.resolve(), { once: true });
  ws.addEventListener("error", () => opened.reject(new Error("WebSocket upgrade rejected")), { once: true });
  ws.addEventListener(
    "close",
    (event) => {
      sockets.delete(ws);
      closed.resolve(event);
      for (const pending of waiting.splice(0)) pending.reject(new Error("WebSocket closed"));
    },
    { once: true },
  );
  ws.addEventListener("message", (event) => {
    const frame = String(event.data);
    if (capture) relayFrames.push(frame);
    const pending = waiting.shift();
    if (pending) pending.resolve(frame);
    else messages.push(frame);
  });
  void opened.promise.catch(() => {});
  return {
    ws,
    opened: opened.promise,
    closed: closed.promise,
    send(frame: string) {
      if (capture) relayFrames.push(frame);
      ws.send(frame);
    },
    async next() {
      const frame = messages.shift();
      if (frame !== undefined) return frame;
      const pending = Promise.withResolvers<string>();
      waiting.push(pending);
      const timer = setTimeout(() => pending.reject(new Error("WebSocket message timed out")), 5000);
      try {
        return await pending.promise;
      } finally {
        clearTimeout(timer);
        const index = waiting.indexOf(pending);
        if (index >= 0) waiting.splice(index, 1);
      }
    },
  };
}
async function connect(credential: AccessCredential, identity?: WorkerIdentity, useRelay = false) {
  const device = identity ?? (await generateDeviceIdentity());
  let address = `${directUrl}/remote/connect`;
  if (useRelay) address = `${relayUrl}/connect/${state.workerId}`;
  const peer = browserSocket(address, origin, useRelay);
  await peer.opened;
  peer.send(JSON.stringify({ type: "connect", capability: state.capability }));
  const connected = JSON.parse(await peer.next()) as { type: string };
  if (connected.type !== "connected") throw new Error("Live relay did not authorize transport");
  const transport = createRelayTransport(peer.ws);
  if (useRelay) {
    const send = transport.send;
    transport.send = (frame) => {
      relayFrames.push(frame);
      send(frame);
    };
  }
  const connection = await createBrowserConnection({
    transport,
    pinnedIdentity: state.identity.publicJwk,
    workerId: state.workerId,
    credential,
    deviceIdentity: device,
    timeoutMs: 5000,
  });
  clients.add(connection);
  return { connection, device, peer };
}
async function post<T>(connection: RemoteConnection, path: string, body: unknown): Promise<T> {
  const response = await connection.fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Worker control request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}
async function share(boardIds = [publicBoard], anonymous = true, expiresAt: number | null = null) {
  return (await post<{ share: IssuedGrant }>(owner, "/remote/access/shares", { boardIds, anonymous, expiresAt })).share;
}
async function localPrincipal(connection: RemoteConnection, device: WorkerIdentity) {
  const grant = (connection.authorization as { grant: IssuedGrant }).grant;
  let kind: "share" | "grant" = "grant";
  if (grant.subject === "bearer") kind = "share";
  return state.access.authenticateEnvelope(
    { deviceId: await getWorkerId(device.publicJwk), devicePublicJwk: device.publicJwk },
    { kind, token: grant.token },
  );
}
function rpc(connection: RemoteConnection): ORPCClient {
  return createORPCClient(
    new RPCLink({ url: "/rpc", origin: "https://worker.invalid", fetch: (url, init) => connection.fetch(url, init) }),
  );
}

/** Only the delayed response source is synthetic; WorkerChannels, access, crypto and WebSockets are real. */
async function streamFixture(
  source: () => ReadableStream<Uint8Array>,
  expiry: number | (() => number),
  now?: () => number,
) {
  const [{ WorkerAccess }, { WorkerChannels, createTransport }] = await Promise.all([
    import("@homarr/worker-access"),
    import("./transport"),
  ]);
  const access = await WorkerAccess.open({
    directory: join(directory, `stream-${randomSecret()}`),
    identity: state.identity,
    now,
  });
  const ownerDevice = await generateDeviceIdentity();
  const authority = await access.authenticateEnvelope(
    { deviceId: await getWorkerId(ownerDevice.publicJwk), devicePublicJwk: ownerDevice.publicJwk },
    { kind: "claim", secret: guard(access.getBootstrapSecret()) },
  );
  const deviceIdentity = await generateDeviceIdentity();
  let expiresAt = expiry;
  if (typeof expiresAt === "function") expiresAt = expiresAt();
  const issued = await access.issueShare(authority.principal, { boardIds: [publicBoard], expiresAt, anonymous: true });
  const fixtureState: WorkerState = { ...state, access };
  const channels = new WorkerChannels(fixtureState, async () => new Response(source()));
  type Peer = { ingress?: ReturnType<typeof createTransport> };
  const server = Bun.serve<Peer>({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request, bunServer) {
      if (bunServer.upgrade(request, { data: {} })) return;
      return new Response(null, { status: 426 });
    },
    websocket: {
      open(socket) {
        const ingress = createTransport(
          (frame) => {
            socket.send(frame);
          },
          () => {
            socket.data.ingress?.ended();
            socket.close();
          },
        );
        socket.data.ingress = ingress;
        void channels.accept(ingress.transport).catch(() => socket.close());
      },
      message(socket, payload) {
        if (typeof payload === "string") socket.data.ingress?.message(payload);
        else socket.close();
      },
      close(socket) {
        socket.data.ingress?.ended();
      },
    },
  });
  cleanupFunctions.push(async () => {
    channels.close();
    await server.stop(true);
    access.close();
  });
  const peer = browserSocket(`ws://127.0.0.1:${server.port}/stream`);
  await peer.opened;
  const connection = await createBrowserConnection({
    transport: createRelayTransport(peer.ws),
    pinnedIdentity: state.identity.publicJwk,
    credential: { kind: "share", token: issued.token },
    deviceIdentity,
    timeoutMs: 5000,
  });
  clients.add(connection);
  return { connection, peer, issued };
}

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "homarr-worker-live-"));
  Object.assign(process.env, {
    NODE_ENV: "test",
    DB_DRIVER: "better-sqlite3",
    DB_URL: join(directory, "domain.sqlite"),
    SECRET_ENCRYPTION_KEY: "a".repeat(64),
    AUTH_SECRET: randomSecret(),
    AUTH_PROVIDERS: "credentials",
    HOMARR_STATE_BACKEND: "memory",
    NO_EXTERNAL_CONNECTION: "true",
    CI: "1",
    LOG_LEVEL: "error",
    WORKER_ALLOWED_ORIGINS: origin,
    WORKER_PLATFORM_URL: `${origin}/remote/`,
  });
  const root = resolve(import.meta.dir, "../../..");
  const migration = Bun.spawn(
    [process.execPath, "packages/db/migrations/sqlite/migrate.ts", "packages/db/migrations/sqlite"],
    { cwd: root, env: process.env, stdout: "pipe", stderr: "pipe" },
  );
  const output = await new Response(migration.stdout).text();
  const errors = await new Response(migration.stderr).text();
  if ((await migration.exited) !== 0)
    throw new Error(`Temporary SQLite migration failed: ${output.slice(-2000)} ${errors.slice(-2000)}`);
  const [{ openWorkerState }, { startWorkerServer }, { createRelay }, database, tables, mediaModule] =
    await Promise.all([
      import("./state"),
      import("./server"),
      import("../../relay/src/relay"),
      import("@homarr/db"),
      import("@homarr/db/schema"),
      import("./media"),
    ]);
  dbModule = database;
  schema = tables;
  media = mediaModule;
  await dbModule.db.insert(schema.boards).values([
    { id: publicBoard, name: "published-integration-fixture", isPublic: false },
    { id: privateBoard, name: privateMarker, isPublic: false },
  ]);
  registrationToken = randomSecret();
  process.env.WORKER_RELAY_REGISTRATION_TOKEN = registrationToken;
  relay = createRelay({
    hostname: "127.0.0.1",
    port: 0,
    allowedOrigins: [origin],
    registrationToken,
    maxUpgradesPerMinute: 1000,
  });
  relayUrl = `ws://127.0.0.1:${relay.server.port}`;
  process.env.WORKER_RELAY_URL = relayUrl;
  state = await openWorkerState(join(directory, "worker"));
  claimSecret = guard(state.access.getBootstrapSecret());
  runtime = startWorkerServer(state, { hostname: "127.0.0.1", port: 0 });
  directUrl = `ws://127.0.0.1:${runtime.server.port}`;
  state.publicUrl = runtime.server.url.origin;
  await until(() => relay.stats().workers === 1);
  ownerIdentity = await generateDeviceIdentity();
  owner = (await connect({ kind: "claim", secret: claimSecret }, ownerIdentity, true)).connection;
  ownerGrant = (owner.authorization as { grant: IssuedGrant }).grant;
  upstream = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      imageRequests++;
      const path = new URL(request.url).pathname;
      if (path === "/oversized") {
        let remaining = 33 * 1024 * 1024;
        const chunk = new Uint8Array(65_536);
        return new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              if (remaining <= 0) {
                controller.close();
                return;
              }
              remaining -= chunk.length;
              controller.enqueue(chunk);
            },
          }),
          { headers: { "Content-Type": "image/png" } },
        );
      }
      if (path === "/html") return new Response("<h1>Not an image</h1>", { headers: { "Content-Type": "text/html" } });
      if (path === "/slow") {
        request.signal.addEventListener("abort", () => slowImageCancelled.resolve(), { once: true });
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(png.subarray(0, 8));
              slowImageStarted.resolve();
            },
            pull() {
              return new Promise<void>(() => {});
            },
            cancel() {
              slowImageCancelled.resolve();
            },
          }),
          { headers: { "Content-Type": "image/png" } },
        );
      }
      return new Response(png, { headers: { "Content-Type": "image/png" } });
    },
  });
  const { ImageProxy } = await import("@homarr/image-proxy");
  imagePath = await new ImageProxy().createImageAsync(`${upstream.url.origin}/fixture.png`);
}, 120_000);

afterAll(async () => {
  for (const cleanup of cleanupFunctions.toReversed()) await cleanup();
  for (const client of clients) client.close();
  for (const client of sockets) client.close();
  if (runtime) await runtime.stop();
  if (relay) await relay.stop();
  if (upstream) await upstream.stop(true);
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("real worker and blind relay security", () => {
  test("local organization invitations create native accounts with reusable encrypted login and revocable sessions", async () => {
    await dbModule.db
      .insert(schema.groups)
      .values({ id: "local-account-everyone", name: "everyone", position: 100 })
      .onConflictDoNothing();
    const everyone = guard(
      await dbModule.db.query.groups.findFirst({ where: dbModule.eq(schema.groups.name, "everyone") }),
    );
    await dbModule.db
      .update(schema.groups)
      .set({ homeBoardId: publicBoard })
      .where(dbModule.eq(schema.groups.id, everyone.id));
    await dbModule.db.insert(schema.groupPermissions).values({ groupId: everyone.id, permission: "app-create" });
    await dbModule.db
      .insert(schema.boardGroupPermissions)
      .values({ groupId: everyone.id, boardId: publicBoard, permission: "view" });
    await post(owner, "/remote/local-accounts", { name: "Local test organization" });
    const { invitation } = await post<{ invitation: { id: string; token: string } }>(
      owner,
      "/remote/local-accounts/invitations",
      {},
    );
    const username = "local-worker-member";
    const password = "Local-account-password-123!";
    const registration = {
      kind: "local-register" as const,
      inviteId: invitation.id,
      token: invitation.token,
      username,
      password,
    };
    const registered = await connect(registration, undefined, true);
    const grant = (registered.connection.authorization as { grant: IssuedGrant }).grant;
    expect(grant.role).toBe("user");
    expect(grant.localAccount).toBe(true);
    const user = await dbModule.db.query.users.findFirst({ where: dbModule.eq(schema.users.id, guard(grant.userId)) });
    expect(user?.provider).toBe("credentials");
    const memberships = await dbModule.db.query.groupMembers.findMany({
      where: dbModule.eq(schema.groupMembers.userId, guard(grant.userId)),
    });
    expect(memberships.map((member) => member.groupId)).toContain(everyone.id);
    expect(user?.password).not.toBe(password);
    expect(user?.password?.startsWith("$2b$")).toBe(true);
    expect(
      await dbModule.db.query.invites.findFirst({ where: dbModule.eq(schema.invites.id, invitation.id) }),
    ).toBeUndefined();
    await expect(connect(registration)).rejects.toThrow();
    await expect(connect({ kind: "local-login", username, password: "incorrect-password" })).rejects.toThrow();
    const returning = await connect({ kind: "local-login", username, password });
    const returningGrant = (returning.connection.authorization as { grant: IssuedGrant }).grant;
    expect(returningGrant.userId).toBe(grant.userId);
    expect(returningGrant.id).not.toBe(grant.id);
    expect((await returning.connection.fetch("/remote/local-accounts")).status).toBe(403);
    const bootstrap = await returning.connection.fetch("/remote/frontend/bootstrap");
    expect(bootstrap.status).toBe(200);
    expect(
      ((await bootstrap.json()) as { session: { user: { permissions: string[] } } }).session.user.permissions,
    ).not.toContain("admin");
    expect(
      (
        (await (await returning.connection.fetch("/remote/frontend/bootstrap")).json()) as {
          session: { user: { permissions: string[] } };
        }
      ).session.user.permissions,
    ).toContain("app-create");
    expect((await rpc(returning.connection).board.getHomeBoard()).id).toBe(publicBoard);
    const members = (await (await owner.fetch("/remote/local-accounts")).json()) as {
      members: { id: string; sessions: number }[];
    };
    expect(members.members).toContainEqual(expect.objectContaining({ id: grant.userId, sessions: 2 }));
    await post(owner, `/remote/local-accounts/sessions/${grant.userId}`, {});
    await expect(connect({ kind: "grant", token: returningGrant.token }, returning.device)).rejects.toThrow();
    const signedInAgain = await connect({ kind: "local-login", username, password });
    expect((signedInAgain.connection.authorization as { grant: IssuedGrant }).grant.userId).toBe(grant.userId);
    const newPassword = "Changed-local-account-password-456!";
    await rpc(owner).user.changePassword({
      userId: guard(grant.userId),
      previousPassword: "admin-reset",
      password: newPassword,
      confirmPassword: newPassword,
    });
    const previousGrant = (signedInAgain.connection.authorization as { grant: IssuedGrant }).grant;
    await expect(connect({ kind: "grant", token: previousGrant.token }, signedInAgain.device)).rejects.toThrow();
    const afterReset = (await (await owner.fetch("/remote/local-accounts")).json()) as {
      members: { id: string; sessions: number }[];
    };
    expect(afterReset.members).toContainEqual(expect.objectContaining({ id: grant.userId, sessions: 0 }));
    await expect(connect({ kind: "local-login", username, password })).rejects.toThrow();
    const afterPasswordChange = await connect({ kind: "local-login", username, password: newPassword });
    expect((afterPasswordChange.connection.authorization as { grant: IssuedGrant }).grant.userId).toBe(grant.userId);
    expect((await owner.fetch(`/remote/local-accounts/members/${grant.userId}`, { method: "DELETE" })).status).toBe(
      200,
    );
    await expect(connect({ kind: "local-login", username, password: newPassword })).rejects.toThrow();
    const revoked = await post<{ invitation: { id: string; token: string } }>(
      owner,
      "/remote/local-accounts/invitations",
      {},
    );
    expect(
      (await owner.fetch(`/remote/local-accounts/invitations/${revoked.invitation.id}`, { method: "DELETE" })).status,
    ).toBe(200);
    await expect(
      connect({
        ...registration,
        inviteId: revoked.invitation.id,
        token: revoked.invitation.token,
        username: "revoked-invite-member",
      }),
    ).rejects.toThrow();
    const createdByAdmin = await post<{ id: string }>(owner, "/remote/local-accounts/members", {
      username: "admin-created-local-member",
      password,
    });
    const createdLogin = await connect({ kind: "local-login", username: "admin-created-local-member", password });
    expect((createdLogin.connection.authorization as { grant: IssuedGrant }).grant.userId).toBe(createdByAdmin.id);
    expect(relayFrames.join("\n")).not.toContain(password);
    expect(relayFrames.join("\n")).not.toContain(invitation.token);
    await dbModule.db
      .update(schema.groups)
      .set({ homeBoardId: everyone.homeBoardId })
      .where(dbModule.eq(schema.groups.id, everyone.id));
    await dbModule.db
      .delete(schema.groupPermissions)
      .where(
        dbModule.and(
          dbModule.eq(schema.groupPermissions.groupId, everyone.id),
          dbModule.eq(schema.groupPermissions.permission, "app-create"),
        ),
      );
    await dbModule.db
      .delete(schema.boardGroupPermissions)
      .where(
        dbModule.and(
          dbModule.eq(schema.boardGroupPermissions.groupId, everyone.id),
          dbModule.eq(schema.boardGroupPermissions.boardId, publicBoard),
        ),
      );
  }, 30_000);
  test("claims exactly once through an authenticated encrypted channel and retains local private state", async () => {
    expect(state.access.claimed).toBe(true);
    expect(ownerGrant.role).toBe("owner");
    expect(Object.keys(owner.authorization as object)).toEqual(["grant"]);
    const info = (await (await owner.fetch("/remote/info")).json()) as { role: string; workerId: string };
    expect(info.role).toBe("owner");
    expect(info.workerId === state.workerId).toBe(true);
    expect((await stat(join(state.directory, "identity.json"))).mode & 0o777).toBe(0o600);
    const pairing = JSON.parse(await readFile(join(state.directory, "pairing.json"), "utf8")) as {
      claimed: boolean;
      url: string;
    };
    expect(pairing.claimed).toBe(true);
    expect(new URL(pairing.url).hash.includes("claim=")).toBe(false);
    await expect(connect({ kind: "claim", secret: claimSecret })).rejects.toThrow();
  });

  test("raw HTTP has only health probes and forged identity headers expose no backend metadata", async () => {
    const base = runtime.server.url.origin;
    expect((await fetch(`${base}/api/health/live`)).status).toBe(200);
    for (const path of [
      "/",
      "/remote/info",
      "/remote/boards",
      "/remote/access/grants",
      "/remote/access/shares/example",
      "/api/openapi",
      "/api/mcp",
      "/api/about",
      "/api/onboarding",
      "/api/image-proxy/not-a-capability",
      "/rpc/info/getInfo",
    ]) {
      const response = await fetch(base + path, {
        headers: {
          Authorization: "Bearer forged",
          "x-homarr-user-id": "admin",
          "x-forwarded-user": "admin",
          Cookie: "homarr.session-token=forged",
        },
      });
      expect(response.status).toBe(404);
      const body = await response.text();
      expect(body.includes(state.workerId)).toBe(false);
      expect(body.includes(privateMarker)).toBe(false);
    }
  });

  test("direct and relay transports reject foreign origins, query capabilities and wrong capabilities", async () => {
    for (const address of [`${directUrl}/remote/connect`, `${relayUrl}/connect/${state.workerId}`]) {
      const foreign = browserSocket(address, "https://foreign.invalid");
      await expect(foreign.opened).rejects.toThrow();
      const wrong = browserSocket(address);
      await wrong.opened;
      wrong.send(JSON.stringify({ type: "connect", capability: randomSecret() }));
      expect((await wrong.closed).code).toBe(1008);
    }
    const direct = new URL(`${directUrl}/remote/connect?cap=forbidden`);
    direct.protocol = "http:";
    expect((await fetch(direct)).status).toBe(403);
    const rejectedRegistration = await fetch(`${relay.server.url.origin}/workers/${state.workerId}`, {
      headers: { Upgrade: "websocket", Connection: "Upgrade" },
    });
    expect(rejectedRegistration.status).toBe(401);
    // The live worker registered through its actual Bun WebSocket constructor using the configured bearer header.
    expect(relay.stats().workers).toBe(1);
  });

  test("actual worker WebSockets close oversized encrypted transport frames without a backend response", async () => {
    const peer = browserSocket(`${directUrl}/remote/connect`);
    await peer.opened;
    peer.send(JSON.stringify({ type: "connect", capability: state.capability }));
    expect((JSON.parse(await peer.next()) as { type: string }).type).toBe("connected");
    peer.send("x".repeat(1_048_577));
    const closed = await peer.closed;
    expect([1006, 1008, 1009].includes(closed.code)).toBe(true);
    expect(relay.stats().workers).toBe(1);
  });

  test("owner calls actual native oRPC mutations and reads against migrated seeded SQLite", async () => {
    const api = rpc(owner);
    const created = await api.app.create({
      name: privateMarker,
      description: null,
      iconUrl: "https://example.test/icon.svg",
      href: "https://example.test/private",
      pingUrl: null,
    });
    const loaded = await api.app.byId({ id: created.appId });
    expect(loaded.name).toBe(privateMarker);
    const persisted = await dbModule.db.query.apps.findFirst({ where: dbModule.eq(schema.apps.id, created.appId) });
    expect(persisted?.name).toBe(privateMarker);
    expect(typeof (await api.info.getInfo()).version).toBe("string");
  }, 30_000);

  test("native media uploads retain multipart file bytes across the encrypted worker transport", async () => {
    const bytes = new Uint8Array(3_147_775);
    bytes.set(png);
    bytes[bytes.length - 1] = 7;
    const files = new FormData();
    files.append("files", new File([bytes], "native-worker-upload.png", { type: "image/png" }));
    const ids = await rpc(owner).media.uploadMedia({ files: files.getAll("files") });
    expect(ids).toHaveLength(1);
    const stored = await dbModule.db.query.medias.findFirst({ where: dbModule.eq(schema.medias.id, guard(ids[0])) });
    expect(stored?.size).toBe(bytes.length);
    expect(stored?.contentType).toBe("image/png");
    expect(stored?.content).toEqual(Buffer.from(bytes));
  }, 30_000);

  test("native frontend bootstraps over encryption and dedicated service capabilities cannot become owners", async () => {
    const bootstrap = await owner.fetch("/remote/frontend/bootstrap");
    expect(bootstrap.status).toBe(200);
    const initialized = (await bootstrap.json()) as { session: { user: { permissions: string[] } }; runtime: object };
    expect(initialized.session.user.permissions).toContain("admin");
    expect(initialized.runtime).toBeObject();
    const selected = "service-selected";
    const other = "service-unselected";
    await dbModule.db.insert(schema.integrations).values([
      { id: selected, name: "Selected service", url: "http://127.0.0.1:1", kind: "jellyfin" },
      { id: other, name: privateMarker, url: "http://127.0.0.1:1", kind: "jellyfin" },
    ]);
    const device = await generateDeviceIdentity();
    for (const procedurePaths of [["user.delete"], ["integration.request"]]) {
      const unsupported = await owner.fetch("/remote/access/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devicePublicJwk: device.publicJwk,
          expiresAt: Date.now() + 60_000,
          service: {
            integrationIds: [selected],
            access: "query",
            procedurePaths,
            audience: "https://homarr.dev/mcp",
            principalId: "account:fixture",
          },
        }),
      });
      expect(unsupported.status).toBe(400);
    }
    const { grant } = await post<{ grant: IssuedGrant }>(owner, "/remote/access/services", {
      role: "owner",
      devicePublicJwk: device.publicJwk,
      expiresAt: Date.now() + 60_000,
      service: {
        integrationIds: [selected],
        access: "query",
        procedurePaths: ["integration.all", "stats.snapshot", "widget.stats.snapshot"],
        audience: "https://homarr.dev/mcp",
        principalId: "account:fixture",
      },
    });
    expect(grant.role).toBe("service");
    const service = (await connect({ kind: "grant", token: grant.token }, device, true)).connection;
    const serviceApi = rpc(service);
    const integrationRows = await serviceApi.integration.all();
    expect(integrationRows.map(({ id }) => id)).toEqual([selected]);
    const discovery = (await (await service.fetch("/remote/mcp/integrations")).json()) as {
      integrations: { id: string; url?: string }[];
    };
    expect(discovery.integrations.map(({ id }) => id)).toEqual([selected]);
    expect(discovery.integrations[0]?.url).toBeUndefined();
    await serviceApi.widget.stats.snapshot({ integrationId: selected });
    await expect(serviceApi.widget.stats.snapshot({ integrationId: other })).rejects.toThrow();
    await expect(serviceApi.app.all()).rejects.toThrow();
    for (const path of ["/api/info", "/remote/frontend/bootstrap", "/remote/access/grants"])
      expect((await service.fetch(path)).status).toBe(403);
    const catalog = (await (await service.fetch("/remote/mcp/catalog")).json()) as { tools: { name: string }[] };
    expect(catalog.tools.map(({ name }) => name).sort()).toEqual(["integration_all", "stats_snapshot"]);
    const result = await post<{ content: { text: string }[] }>(service, "/remote/mcp/call", {
      name: "integration_all",
      input: {},
    });
    expect(JSON.stringify(result)).toContain("Selected service");
    expect(JSON.stringify(result)).not.toContain(privateMarker);
    const forbidden = await service.fetch("/remote/mcp/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "board_getAllBoards", input: {} }),
    });
    expect(forbidden.status).toBe(403);
    const user = await dbModule.db.query.users.findFirst({
      where: dbModule.eq(schema.users.id, `worker-service:${grant.id}`),
      with: { groups: true },
    });
    expect(user).toBeDefined();
    expect(user?.groups).toHaveLength(0);
    expect((await owner.fetch(`/remote/access/grants/${grant.id}`, { method: "DELETE" })).status).toBe(200);
    await expect(service.fetch("/remote/mcp/catalog")).rejects.toThrow();
  }, 30_000);

  test("encrypted native REST accepts parameterless reads and coerces validated numeric query values", async () => {
    const name = `${privateMarker}-rest-query`;
    await dbModule.db.insert(schema.apps).values({ id: "rest-query-app", name, iconUrl: "" });
    const info = await owner.fetch("/api/info");
    expect(info.status).toBe(200);
    expect(typeof ((await info.json()) as { version: string }).version).toBe("string");
    const all = await owner.fetch("/api/apps");
    expect(all.status).toBe(200);
    expect(Array.isArray(await all.json())).toBe(true);
    const defaults = await owner.fetch("/api/apps/paginated");
    expect(defaults.status).toBe(200);
    const paginated = await owner.fetch(`/api/apps/paginated?search=${encodeURIComponent(name)}&page=1&pageSize=1`);
    expect(paginated.status).toBe(200);
    const result = (await paginated.json()) as { items: { name: string }[]; totalCount: number };
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.name).toBe(name);
    expect(result.totalCount).toBe(1);
    for (const query of ["page=not-a-number", "page=0", "pageSize=101"]) {
      expect((await owner.fetch(`/api/apps/paginated?${query}`)).status).toBe(400);
    }
  });

  test("the real outbound worker rejects duplicate relay challenges before signing twice", async () => {
    const { connectRelay } = await import("./transport");
    const disconnected = Promise.withResolvers<void>();
    let registrations = 0;
    let rejected = false;
    const malicious = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch(request, server) {
        if (server.upgrade(request)) return;
        return new Response(null, { status: 426 });
      },
      websocket: {
        open(socket) {
          socket.send(JSON.stringify({ type: "challenge", nonce: randomSecret() }));
          socket.send(JSON.stringify({ type: "challenge", nonce: randomSecret() }));
        },
        message(_socket, payload) {
          if (typeof payload === "string" && (JSON.parse(payload) as { type: string }).type === "register")
            registrations++;
        },
        close() {
          rejected = true;
          disconnected.resolve();
        },
      },
    });
    const stop = connectRelay({ ...state, relayUrl: malicious.url.origin }, runtime.channels);
    try {
      await until(() => rejected, 3000);
      await disconnected.promise;
      expect(registrations <= 1).toBe(true);
      expect(relay.stats().workers).toBe(1);
    } finally {
      stop();
      await malicious.stop(true);
    }
  });

  test("anonymous shares see only explicitly published boards and cannot call owner RPC or control APIs", async () => {
    const issued = await share();
    const copied = await owner.fetch(`/remote/access/shares/${issued.id}`);
    expect(copied.status).toBe(200);
    expect(copied.headers.get("Cache-Control")).toBe("no-store");
    expect(await copied.json()).toEqual({ share: { id: issued.id, token: issued.token, expiresAt: issued.expiresAt } });
    expect((await owner.fetch(`/remote/access/shares/${issued.id}/extra`)).status).toBe(404);
    expect((await owner.fetch(`/remote/access/shares/${ownerGrant.id}`)).status).toBe(404);
    const { connection: viewer } = await connect({ kind: "share", token: issued.token });
    expect((await viewer.fetch(`/remote/access/shares/${issued.id}`)).status).toBe(403);
    const boardList = (await (await viewer.fetch("/remote/boards")).json()) as { boards: { id: string }[] };
    expect(boardList.boards.map((board) => board.id)).toEqual([publicBoard]);
    expect((await viewer.fetch(`/remote/boards/${publicBoard}`)).status).toBe(200);
    expect((await viewer.fetch(`/remote/boards/${privateBoard}`)).status).toBe(403);
    for (const path of [
      "/remote/access/grants",
      "/remote/access/shares",
      "/api/openapi",
      imagePath,
      "/rpc/info/getInfo",
    ]) {
      expect(
        (
          await viewer.fetch(path, {
            method: "GET",
            headers: { "x-homarr-user-id": "admin", Authorization: "Bearer forged" },
          })
        ).status,
      ).toBe(403);
    }
    expect((await viewer.fetch("/remote/access/invitations", { method: "POST", body: "{}" })).status).toBe(403);
  });

  test("shared dashboards use native Homarr board reads without disclosing other public dashboards", async () => {
    const unrelated = "native-viewer-other-public";
    await dbModule.db
      .insert(schema.boards)
      .values({ id: unrelated, name: "unrelated-public-dashboard", isPublic: true });
    const issued = await share();
    const { connection: viewer } = await connect({ kind: "share", token: issued.token });
    const bootstrap = await viewer.fetch("/remote/frontend/bootstrap");
    expect(bootstrap.status).toBe(200);
    const initial = (await bootstrap.json()) as {
      session: { user: { permissions: string[] } };
      assistantAvailability: string;
    };
    expect(initial.session.user.permissions).toEqual([]);
    expect(initial.assistantAvailability).toBe("unauthenticated");
    const api = rpc(viewer);
    const board = await api.board.getBoardByName({ name: "published-integration-fixture" });
    expect(board.id).toBe(publicBoard);
    expect(board.layouts).toBeArray();
    const visible = await api.board.getAllBoards();
    expect(visible.map(({ id }) => id)).toEqual([publicBoard]);
    await expect(api.board.getBoardByName({ name: "unrelated-public-dashboard" })).rejects.toThrow();
    await expect(api.board.getBoardByName({ name: privateMarker })).rejects.toThrow();
    await expect(api.app.all()).rejects.toThrow();
  }, 30_000);

  test("invited Homarr users keep their native permissions and lose access when permissions or identity change", async () => {
    const userId = "native-remote-user";
    const groupId = "native-remote-user-group";
    await dbModule.db.insert(schema.users).values({ id: userId, name: "Native remote user", provider: "credentials" });
    await dbModule.db.insert(schema.groups).values({ id: groupId, name: groupId, position: 10 });
    await dbModule.db.insert(schema.groupMembers).values({ groupId, userId });
    await dbModule.db.insert(schema.groupPermissions).values({ groupId, permission: "app-create" });
    const invitation = (
      await post<{ invitation: IssuedGrant }>(owner, "/remote/access/invitations", {
        role: "user",
        userId,
        expiresAt: Date.now() + 60_000,
      })
    ).invitation;
    const device = await generateDeviceIdentity();
    const human = await connect({ kind: "invite", token: invitation.token }, device, true);
    const grant = (human.connection.authorization as { grant: IssuedGrant }).grant;
    expect(grant.role).toBe("user");
    expect(grant.userId).toBe(userId);
    const bootstrap = (await (await human.connection.fetch("/remote/frontend/bootstrap")).json()) as {
      session: { user: { id: string; permissions: string[] } };
    };
    expect(bootstrap.session.user.id).toBe(userId);
    expect(bootstrap.session.user.permissions).toContain("app-create");
    expect(bootstrap.session.user.permissions).not.toContain("admin");
    const input = {
      name: "Native user app",
      description: null,
      iconUrl: "https://example.test/icon.svg",
      href: "https://example.test",
      pingUrl: null,
    };
    await rpc(human.connection).app.create(input);
    expect((await human.connection.fetch("/remote/access/grants")).status).toBe(403);
    await expect(rpc(human.connection).frontend.certificates()).rejects.toThrow();
    await dbModule.db.delete(schema.groupPermissions).where(dbModule.eq(schema.groupPermissions.groupId, groupId));
    await until(() => human.peer.ws.readyState === WebSocket.CLOSED);
    const current = await connect({ kind: "grant", token: grant.token }, device, true);
    await expect(rpc(current.connection).app.create(input)).rejects.toThrow();
    await dbModule.db.delete(schema.users).where(dbModule.eq(schema.users.id, userId));
    await until(() => current.peer.ws.readyState === WebSocket.CLOSED);
    await expect(connect({ kind: "grant", token: grant.token }, device, true)).rejects.toThrow();
  }, 30_000);

  test("private shares require worker-approved membership and preserve the membership board scope", async () => {
    const privateShare = await share([publicBoard, privateBoard], false);
    await expect(connect({ kind: "share", token: privateShare.token })).rejects.toThrow();
    const invitation = (
      await post<{ invitation: IssuedGrant }>(owner, "/remote/access/invitations", {
        role: "viewer",
        boardIds: [publicBoard],
        expiresAt: Date.now() + 60_000,
      })
    ).invitation;
    const memberIdentity = await generateDeviceIdentity();
    const member = await connect({ kind: "invite", token: invitation.token }, memberIdentity);
    const { connection: approved } = await connect({ kind: "share", token: privateShare.token }, memberIdentity);
    expect((await approved.fetch(`/remote/boards/${publicBoard}`)).status).toBe(200);
    expect((await approved.fetch(`/remote/boards/${privateBoard}`)).status).toBe(403);
    const membership = (member.connection.authorization as { grant: IssuedGrant }).grant;
    expect((await owner.fetch(`/remote/access/grants/${membership.id}`, { method: "DELETE" })).status).toBe(200);
    await expect(approved.fetch("/remote/info")).rejects.toThrow();
  });

  test("invitation redemption is single-use and invitation revocation terminates existing sessions", async () => {
    const invitation = (
      await post<{ invitation: IssuedGrant }>(owner, "/remote/access/invitations", {
        role: "viewer",
        boardIds: [publicBoard],
        expiresAt: Date.now() + 60_000,
      })
    ).invitation;
    const { connection: invited } = await connect({ kind: "invite", token: invitation.token });
    await expect(connect({ kind: "invite", token: invitation.token })).rejects.toThrow();
    expect((await owner.fetch(`/remote/access/invitations/${invitation.id}`, { method: "DELETE" })).status).toBe(200);
    await expect(invited.fetch("/remote/info")).rejects.toThrow();
  });

  test("revoking a permanent anonymous share closes live sessions and prevents reconnect", async () => {
    const issued = await share();
    const { connection: viewer } = await connect({ kind: "share", token: issued.token }, undefined, true);
    expect((await owner.fetch(`/remote/access/shares/${issued.id}`, { method: "DELETE" })).status).toBe(200);
    await expect(viewer.fetch("/remote/info")).rejects.toThrow();
    await expect(connect({ kind: "share", token: issued.token }, undefined, true)).rejects.toThrow();
  });

  test("signed media binds the exact share, board, asset, expiry and signature", async () => {
    const firstShare = await share();
    const first = await connect({ kind: "share", token: firstShare.token });
    const { principal } = await localPrincipal(first.connection, first.device);
    const path = await media.createBoardMediaPath(state, principal, publicBoard, imagePath);
    const response = await first.connection.fetch(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(png);
    expect((await owner.fetch(path)).status).toBe(401);
    const second = await connect({ kind: "share", token: (await share()).token });
    expect((await second.connection.fetch(path)).status).toBe(401);
    expect((await first.connection.fetch(path.replace(publicBoard, privateBoard))).status).toBe(403);
    const token = path.slice(path.lastIndexOf("/") + 1);
    const [encoded, signature] = token.split(".");
    let replacement = "A";
    if (guard(signature).endsWith("A")) replacement = "B";
    const modifiedSignature = guard(signature).slice(0, -1) + replacement;
    expect(
      (await first.connection.fetch(path.slice(0, -token.length) + `${encoded}.${modifiedSignature}`)).status,
    ).toBe(401);
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(guard(encoded)))) as {
      expiresAt: number;
      assetId: string;
    };
    payload.expiresAt = Date.now() - 1;
    const expired = toBase64Url(utf8(JSON.stringify(payload)));
    const expiredSignature = await signIdentity(state.identity, `homarr-board-media-v1:${expired}`);
    expect((await first.connection.fetch(path.slice(0, -token.length) + `${expired}.${expiredSignature}`)).status).toBe(
      401,
    );
    const beforeRevocation = imageRequests;
    await owner.fetch(`/remote/access/shares/${firstShare.id}`, { method: "DELETE" });
    await expect(
      media.readBoardMedia(state, principal, publicBoard, token, new Request("https://worker.invalid" + path)),
    ).rejects.toThrow();
    expect(imageRequests).toBe(beforeRevocation);
  });

  test("shared media rejects oversized or non-image upstream data and cancellation reaches the upstream", async () => {
    const { ImageProxy } = await import("@homarr/image-proxy");
    const issued = await share();
    const viewer = await connect({ kind: "share", token: issued.token });
    const { principal } = await localPrincipal(viewer.connection, viewer.device);
    for (const [source, status] of [
      ["oversized", 502],
      ["html", 415],
    ] as const) {
      const image = await new ImageProxy().createImageAsync(`${upstream.url.origin}/${source}`);
      const path = await media.createBoardMediaPath(state, principal, publicBoard, image);
      expect((await viewer.connection.fetch(path)).status).toBe(status);
    }
    slowImageStarted = Promise.withResolvers<void>();
    slowImageCancelled = Promise.withResolvers<void>();
    const image = await new ImageProxy().createImageAsync(`${upstream.url.origin}/slow`);
    const path = await media.createBoardMediaPath(state, principal, publicBoard, image);
    const controller = new AbortController();
    const response = viewer.connection.fetch(path, { signal: controller.signal });
    void response.catch(() => {});
    await slowImageStarted.promise;
    controller.abort();
    await expect(response).rejects.toThrow("aborted");
    let cancelled = false;
    void slowImageCancelled.promise.then(() => {
      cancelled = true;
    });
    await until(() => cancelled, 3000);
    expect(cancelled).toBe(true);
  }, 10_000);

  test("a grant expiring during an awaited source read cannot emit its delayed plaintext", async () => {
    const clock = { value: Date.now() };
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const fixture = await streamFixture(
      () =>
        new ReadableStream<Uint8Array>({
          async pull(controller) {
            entered.resolve();
            await release.promise;
            controller.enqueue(utf8(privateMarker));
          },
        }),
      clock.value + 60_000,
      () => clock.value,
    );
    const response = await fixture.connection.fetch("/stream");
    const reader = guard(response.body).getReader();
    const pending = reader.read();
    void pending.catch(() => {});
    await entered.promise;
    clock.value += 60_001;
    release.resolve();
    await expect(pending).rejects.toThrow();
    fixture.connection.close();
  });

  test("the exact expiry timer closes an idle stream before the one-second revalidation interval", async () => {
    const sourceStarted = Promise.withResolvers<void>();
    const fixture = await streamFixture(
      () =>
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(utf8("first"));
          },
          pull() {
            sourceStarted.resolve();
            return new Promise<void>(() => {});
          },
        }),
      // Authority and key setup must not consume this short, real expiry window.
      () => Date.now() + 350,
    );
    const response = await fixture.connection.fetch("/stream");
    const reader = guard(response.body).getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toBe("first");
    await sourceStarted.promise;
    const pending = reader.read();
    void pending.catch(() => {});
    await expect(pending).rejects.toThrow();
    const expiresAt = guard(fixture.issued.expiresAt);
    expect(Date.now() >= expiresAt).toBe(true);
    expect(Date.now() - expiresAt < 400).toBe(true);
    expect((await fixture.peer.closed).code).toBe(1000);
  }, 3000);

  test("the actual relay carries ciphertext rather than claim secrets, grants or private domain payloads", () => {
    expect(relayFrames.length > 10).toBe(true);
    for (const secret of [claimSecret, ownerGrant.token, privateMarker, registrationToken]) {
      expect(relayFrames.some((frame) => frame.includes(secret))).toBe(false);
    }
    expect(relayFrames.some((frame) => JSON.parse(frame).type === "encrypted")).toBe(true);
  });

  test("browser reconnects use fresh sessions and the worker reconnects after an actual relay restart", async () => {
    const first = await connect({ kind: "grant", token: ownerGrant.token }, ownerIdentity, true);
    const initial = relayFrames.filter((frame) => JSON.parse(frame).type === "server-hello").at(-1);
    first.connection.close();
    const relayPort = relay.server.port;
    await relay.stop();
    const { createRelay } = await import("../../relay/src/relay");
    relay = createRelay({ hostname: "127.0.0.1", port: relayPort, allowedOrigins: [origin], registrationToken });
    await until(() => relay.stats().workers === 1, 8000);
    const next = await connect({ kind: "grant", token: ownerGrant.token }, ownerIdentity, true);
    const latest = relayFrames.filter((frame) => JSON.parse(frame).type === "server-hello").at(-1);
    expect(JSON.parse(guard(initial)).sessionId === JSON.parse(guard(latest)).sessionId).toBe(false);
    expect((await next.connection.fetch("/remote/info")).status).toBe(200);
  }, 15_000);
});
