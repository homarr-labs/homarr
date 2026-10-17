import { describe, expect, onTestFinished, test, vi } from "vitest";

import { getSessionFromToken, hashPasswordAsync } from "@homarr/auth";
import { getSessionFromApiKeyAsync } from "@homarr/auth/api-key";
import { eq } from "@homarr/db";
import { apiKeys, groupMembers, groupPermissions, groups, sessions, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { SupportedAuthProvider } from "@homarr/definitions";

import { extractMcpToolsFromProcedures } from "../../mcp-tools";
import { createTRPCRouter } from "../../trpc";
import { apiKeysRouter } from "../apiKeys";

vi.mock("@homarr/auth", async () => {
  const security = await import("@homarr/auth/security");
  const { getSessionFromToken: readSessionFromToken } = await import("@homarr/auth/server");
  return { ...security, getSessionFromToken: readSessionFromToken };
});

const ownerId = "oauth-owner";
const otherUserId = "other-user";
const issuedAt = new Date("2026-10-10T12:34:56.789Z");
const ownerSessionToken = "owner-session-token";
const adminSessionToken = "admin-session-token";
const oauthMetadata = (id: string) => ({
  oauthClientId: `client-${id}`,
  oauthClientName: `Client ${id}`,
  oauthRedirectUri: `https://client.example/${id}/callback`,
  oauthIssuedAt: issuedAt,
});

const setupAsync = async (provider: SupportedAuthProvider = "credentials") => {
  const db = createDb();
  onTestFinished(() => {
    db.$client.close();
  });
  await db.insert(users).values([
    { id: ownerId, name: "Owner", email: "owner@example.com", provider },
    { id: otherUserId, name: "Administrator", email: "admin@example.com", image: "admin.png" },
  ]);
  await db.insert(groups).values({ id: "admins", name: "admins", position: 0 });
  await db.insert(groupMembers).values({ groupId: "admins", userId: otherUserId });
  await db.insert(groupPermissions).values({ groupId: "admins", permission: "admin" });
  await db.insert(sessions).values([
    { sessionToken: ownerSessionToken, userId: ownerId, expires: new Date("2099-01-01") },
    { sessionToken: adminSessionToken, userId: otherUserId, expires: new Date("2099-01-01") },
  ]);
  const keys = [
    { id: "own-oauth", userId: ownerId, ...oauthMetadata("own-oauth") },
    { id: "own-oauth-retained", userId: ownerId, ...oauthMetadata("own-oauth-retained") },
    { id: "own-manual", userId: ownerId },
    { id: "foreign-oauth", userId: otherUserId, ...oauthMetadata("foreign-oauth") },
    { id: "foreign-manual", userId: otherUserId },
  ];
  await db
    .insert(apiKeys)
    .values(
      await Promise.all(keys.map(async (key) => ({ ...key, apiKey: await hashPasswordAsync(`token-${key.id}`) }))),
    );
  const session = await getSessionFromToken(db, ownerSessionToken);
  if (!session) throw new Error("Expected a persisted owner session");
  const caller = apiKeysRouter.createCaller({ db, deviceType: undefined, session });
  const authenticateAsync = (id: string) =>
    getSessionFromApiKeyAsync(db, `${id}.token-${id}`, null, "oauth-key-router-test");

  return { db, session, caller, authenticateAsync };
};

describe("owner OAuth API keys", () => {
  test.each(["credentials", "oidc"] as const)(
    "allows a non-admin %s owner to list and revoke one grant without changing other credentials or sessions",
    async (provider) => {
      const { db, session, caller, authenticateAsync } = await setupAsync(provider);
      const keysBefore = await db.query.apiKeys.findMany();
      const sessionsBefore = await db.query.sessions.findMany();

      expect(session.user.permissions).not.toContain("admin");
      expect(await caller.getOwnOAuth()).toEqual([
        { id: "own-oauth", ...oauthMetadata("own-oauth") },
        { id: "own-oauth-retained", ...oauthMetadata("own-oauth-retained") },
      ]);
      expect((await authenticateAsync("own-oauth"))?.user.id).toBe(ownerId);
      await expect(caller.revokeOwnOAuth({ apiKeyId: "own-oauth" })).resolves.toBeUndefined();
      await expect(caller.revokeOwnOAuth({ apiKeyId: "own-oauth" })).resolves.toBeUndefined();

      expect(await authenticateAsync("own-oauth")).toBeNull();
      expect(await db.query.apiKeys.findMany()).toEqual(keysBefore.filter(({ id }) => id !== "own-oauth"));
      expect(await db.query.sessions.findMany()).toEqual(sessionsBefore);
      expect(await getSessionFromToken(db, ownerSessionToken)).toEqual(session);
      expect(await caller.getOwnOAuth()).toEqual([
        { id: "own-oauth-retained", ...oauthMetadata("own-oauth-retained") },
      ]);
      for (const id of ["own-oauth-retained", "own-manual", "foreign-oauth", "foreign-manual"]) {
        expect(await authenticateAsync(id)).not.toBeNull();
      }
    },
  );

  test("returns the same result for foreign, manual and missing IDs without deleting any key", async () => {
    const { db, caller } = await setupAsync();
    const keysBefore = await db.query.apiKeys.findMany();

    for (const apiKeyId of ["foreign-oauth", "own-manual", "foreign-manual", "missing"]) {
      await expect(caller.revokeOwnOAuth({ apiKeyId })).resolves.toBeUndefined();
    }

    expect(await db.query.apiKeys.findMany()).toEqual(keysBefore);
  });

  test("requires authentication for both owner procedures", async () => {
    const { db } = await setupAsync();
    const caller = apiKeysRouter.createCaller({ db, deviceType: undefined, session: null });

    await expect(caller.getOwnOAuth()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.revokeOwnOAuth({ apiKeyId: "own-oauth" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(await db.query.apiKeys.findMany()).toHaveLength(5);
  });
});

test("keeps global key management admin-only and projects only safe metadata and existing user fields", async () => {
  const { db, caller } = await setupAsync();
  await expect(caller.getAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(caller.delete({ apiKeyId: "foreign-oauth" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  const adminSession = await getSessionFromToken(db, adminSessionToken);
  if (!adminSession) throw new Error("Expected a persisted administrator session");
  const adminCaller = apiKeysRouter.createCaller({ db, deviceType: undefined, session: adminSession });
  const allKeys = await adminCaller.getAll();

  expect(allKeys).toHaveLength(5);
  expect(allKeys.find(({ id }) => id === "foreign-oauth")).toEqual({
    id: "foreign-oauth",
    ...oauthMetadata("foreign-oauth"),
    user: { id: otherUserId, name: "Administrator", email: "admin@example.com", image: "admin.png" },
  });
  expect(allKeys.find(({ id }) => id === "own-manual")).toEqual({
    id: "own-manual",
    oauthClientId: null,
    oauthClientName: null,
    oauthRedirectUri: null,
    oauthIssuedAt: null,
    user: { id: ownerId, name: "Owner", email: "owner@example.com", image: null },
  });
  for (const key of allKeys) {
    expect(Object.keys(key).toSorted()).toEqual(
      ["id", "oauthClientId", "oauthClientName", "oauthRedirectUri", "oauthIssuedAt", "user"].toSorted(),
    );
  }
  await adminCaller.delete({ apiKeyId: "foreign-oauth" });
  expect(await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, "foreign-oauth") })).toBeUndefined();
});

test("explicitly disables owner OAuth procedures in the MCP tool catalog", () => {
  expect(apiKeysRouter.getOwnOAuth["_def"].meta).toMatchObject({ mcp: { enabled: false } });
  expect(apiKeysRouter.revokeOwnOAuth["_def"].meta).toMatchObject({ mcp: { enabled: false } });
  const router = createTRPCRouter({ apiKeys: apiKeysRouter });
  const catalog = extractMcpToolsFromProcedures(router);

  expect(catalog.diagnostics).toEqual([]);
  expect(catalog.tools.map(({ name }) => name)).toEqual(["apiKeys_delete", "apiKeys_getAll"]);
});
