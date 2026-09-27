import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { decryptSecret } from "@homarr/common/server";
import { DB_CASING } from "@homarr/core/infrastructure/db/constants";
import type { GroupPermissionKey } from "@homarr/definitions";
import { createGetSetChannel, getIntegrationSessionStoreKey } from "@homarr/redis";

import { boardRouter } from "../../packages/api/src/router/board";
import { integrationRouter } from "../../packages/api/src/router/integration/integration-router";
import * as schema from "../../packages/db/schema/sqlite";

const credential = "contract-only-gluetun-key";
let acceptedCredential = credential;
const ownerId = createId();
const readerId = createId();
const session = (id: string, permissions: GroupPermissionKey[] = []): Session => ({
  user: { id, permissions, colorScheme: "light" },
  expires: "2099-01-01T00:00:00.000Z",
});
const owner = session(ownerId, ["admin", "integration-create", "integration-full-all", "board-create"]);
const reader = session(readerId);
const observedRequests: { path: string; authenticated: boolean }[] = [];
const upstream = createServer((request, response) => {
  const authenticated = request.headers["x-api-key"] === acceptedCredential;
  observedRequests.push({ path: request.url ?? "", authenticated });
  if (request.url !== "/v1/vpn/status") {
    response.writeHead(404).end();
    return;
  }
  if (!authenticated) {
    response.writeHead(401).end();
    return;
  }
  response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ status: "running" }));
});
let upstreamUrl: string;
let directory: string;
let sqlite: Database.Database;
const connect = (filename: string) => {
  sqlite = new Database(filename);
  sqlite.pragma("foreign_keys = ON");
  const connection = drizzle(sqlite, { schema, casing: DB_CASING });
  migrate(connection, { migrationsFolder: "./packages/db/migrations/sqlite" });
  return connection;
};
let db: ReturnType<typeof connect>;
const context = (currentSession: Session | null) => ({ db, session: currentSession, deviceType: undefined });
const integrationCaller = (currentSession: Session | null = owner) =>
  integrationRouter.createCaller(context(currentSession));
const boardCaller = (currentSession: Session | null = owner) => boardRouter.createCaller(context(currentSession));
const reopen = () => {
  sqlite.close();
  db = connect(join(directory, "flow.sqlite"));
};
const integrationInput = (key = credential) => ({
  name: "Contract VPN",
  kind: "gluetun" as const,
  url: upstreamUrl,
  secrets: [{ kind: "apiKey" as const, value: key }],
  attemptSearchEngineCreation: false,
});
const createIntegration = async () => {
  const result = await integrationCaller().create(integrationInput());
  if (!result.integration) throw new Error("Expected successful connection and persisted integration");
  return result.integration;
};
const createBoard = () => boardCaller().createBoard({ name: "Private-Operations", columnCount: 12, isPublic: false });

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    upstream.once("error", reject);
    upstream.listen(0, "127.0.0.1", resolve);
  });
  const address = upstream.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  upstreamUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  upstream.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    upstream.close((error) => {
      if (error) reject(error);
      else resolve();
    }),
  );
});
beforeEach(async () => {
  observedRequests.length = 0;
  acceptedCredential = credential;
  directory = mkdtempSync(join(tmpdir(), "homarr-contract-flow-"));
  db = connect(join(directory, "flow.sqlite"));
  await db.insert(schema.users).values([
    { id: ownerId, name: "Owner" },
    { id: readerId, name: "Reader" },
  ]);
});
afterEach(() => {
  if (sqlite?.open) sqlite.close();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

test("an administrator saves a verified integration with restart-safe encrypted credentials and redacted reads", async () => {
  const created = await createIntegration();
  expect(observedRequests).toContainEqual({ path: "/v1/vpn/status", authenticated: true });
  expect(JSON.stringify(created)).not.toContain(credential);
  reopen();
  const stored = await db.query.integrationSecrets.findMany();
  expect(stored).toHaveLength(1);
  expect(stored[0]?.value).not.toBe(credential);
  const savedSecret = stored[0];
  if (!savedSecret) throw new Error("Expected a persisted integration secret");
  expect(decryptSecret(savedSecret.value)).toBe(credential);
  const details = await integrationCaller().byId({ id: created.id });
  expect(details).toMatchObject({ id: created.id, name: "Contract VPN", secrets: [{ kind: "apiKey", value: null }] });
  expect(JSON.stringify(await integrationCaller().all())).not.toContain(credential);
});

test("updating credentials invalidates the real cached session and preserves masked credentials on later edits", async () => {
  const created = await createIntegration();
  const cachedSession = createGetSetChannel(getIntegrationSessionStoreKey(created.id));
  await cachedSession.setAsync({ token: "obsolete-upstream-session" });
  expect(await cachedSession.getAsync()).toEqual({ token: "obsolete-upstream-session" });
  acceptedCredential = "rotated-contract-key";
  const update = {
    id: created.id,
    name: "Rotated VPN",
    url: upstreamUrl,
    appId: null,
    secrets: [{ kind: "apiKey" as const, value: acceptedCredential }],
  };
  await integrationCaller().update(update);
  expect(await cachedSession.getAsync()).toBeNull();
  reopen();
  const rotatedSecrets = await db.query.integrationSecrets.findMany();
  expect(rotatedSecrets).toHaveLength(1);
  const rotatedSecret = rotatedSecrets[0];
  if (!rotatedSecret) throw new Error("Expected the rotated integration secret");
  expect(decryptSecret(rotatedSecret.value)).toBe(acceptedCredential);
  const requestsBefore = observedRequests.length;
  await integrationCaller().update({ ...update, name: "Renamed VPN", secrets: [{ kind: "apiKey", value: null }] });
  expect(observedRequests.slice(requestsBefore)).toContainEqual({ path: "/v1/vpn/status", authenticated: true });
  expect(await db.query.integrationSecrets.findMany()).toEqual(rotatedSecrets);
  expect(await integrationCaller().byId({ id: created.id })).toMatchObject({
    name: "Renamed VPN",
    secrets: [{ value: null }],
  });
});

test("rejected upstream credentials do not create an integration or secret", async () => {
  const result = await integrationCaller().create(integrationInput("wrong-contract-key"));
  expect(result.error).toBeDefined();
  expect(observedRequests).toContainEqual({ path: "/v1/vpn/status", authenticated: false });
  reopen();
  expect(await db.query.integrations.findMany()).toEqual([]);
  expect(await db.query.integrationSecrets.findMany()).toEqual([]);
});

test("unrelated users cannot create, inspect or delete a saved integration", async () => {
  const created = await createIntegration();
  const before = await db.query.integrationSecrets.findMany();
  const requestsBefore = observedRequests.length;
  await expect(integrationCaller(reader).create(integrationInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(integrationCaller(reader).byId({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(integrationCaller(reader).delete({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(integrationCaller(null).all()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  expect(observedRequests).toHaveLength(requestsBefore);
  expect(await integrationCaller(reader).all()).toEqual([]);
  reopen();
  expect(await db.query.integrations.findMany()).toHaveLength(1);
  expect(await db.query.integrationSecrets.findMany()).toEqual(before);
});

test("a persisted use-only grant allows discovery without granting credential management and can be revoked", async () => {
  const created = await createIntegration();
  await integrationCaller().saveUserIntegrationPermissions({
    entityId: created.id,
    permissions: [{ principalId: readerId, permission: "use" }],
  });
  reopen();
  expect(await integrationCaller(reader).all()).toMatchObject([
    { id: created.id, permissions: { hasUseAccess: true, hasFullAccess: false } },
  ]);
  await expect(integrationCaller(reader).byId({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    integrationCaller(reader).saveUserIntegrationPermissions({ entityId: created.id, permissions: [] }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await integrationCaller().saveUserIntegrationPermissions({ entityId: created.id, permissions: [] });
  expect(await integrationCaller(reader).all()).toEqual([]);
});

test("board creation and item insertion survive reopening and preserve the existing home board", async () => {
  const created = await createBoard();
  const item = await boardCaller().addItem({
    boardId: created.boardId,
    kind: "notebook",
    options: { content: "<p>Saved operational note</p>" },
  });
  await boardCaller().createBoard({ name: "Second-Board", columnCount: 6, isPublic: false });
  reopen();
  const loaded = await boardCaller().getBoardByName({ name: "Private-Operations" });
  expect(loaded.id).toBe(created.boardId);
  expect(loaded.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: item.itemId,
        kind: "notebook",
        options: expect.objectContaining({ content: "<p>Saved operational note</p>" }),
      }),
    ]),
  );
  expect(loaded.layouts.map((layout) => layout.role).toSorted()).toEqual(["base", "mobile"]);
  expect(await db.query.itemLayouts.findMany()).toHaveLength(2);
  const savedOwner = await db.query.users.findFirst({ where: (user, { eq }) => eq(user.id, ownerId) });
  expect(savedOwner?.homeBoardId).toBe(created.boardId);
});

test("private sharing, revocation and public visibility never grant an unrelated user write access", async () => {
  const created = await createBoard();
  for (const currentSession of [reader, null]) {
    await expect(boardCaller(currentSession).getBoardByName({ name: "Private-Operations" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  }
  await boardCaller().saveUserBoardPermissions({
    entityId: created.boardId,
    permissions: [{ principalId: readerId, permission: "view" }],
  });
  expect((await boardCaller(reader).getBoardByName({ name: "Private-Operations" })).id).toBe(created.boardId);
  await expect(boardCaller(reader).renameBoard({ id: created.boardId, name: "Stolen" })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await boardCaller().saveUserBoardPermissions({ entityId: created.boardId, permissions: [] });
  await expect(boardCaller(reader).getBoardByName({ name: "Private-Operations" })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await boardCaller().changeBoardVisibility({ id: created.boardId, visibility: "public" });
  reopen();
  expect((await boardCaller(null).getBoardByName({ name: "Private-Operations" })).id).toBe(created.boardId);
  await expect(boardCaller(reader).deleteBoard({ id: created.boardId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect((await boardCaller().getBoardByName({ name: "Private-Operations" })).name).toBe("Private-Operations");
});
