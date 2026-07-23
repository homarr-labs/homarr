import { TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { boards, integrationItems, integrations, integrationUserPermissions, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { PatchMonStats } from "@homarr/integrations";

import { patchmonRouter } from "../../widgets/patchmon";

const samplePatchMonStats = {
  totalHosts: 42,
  hostsNeedingUpdates: 15,
  securityUpdates: 23,
  upToDateHosts: 27,
  hostsWithSecurityUpdates: 8,
  recentUpdates24h: 34,
  totalOutdatedPackages: 156,
  totalRepos: 12,
  lastUpdated: "2025-10-11T12:34:56.789Z",
  osDistribution: [],
} satisfies PatchMonStats;

vi.mock("@homarr/request-handler/patchmon", () => ({
  patchmonStatsRequestHandler: {
    handler: () => ({
      getDataAsync: async () => ({
        data: samplePatchMonStats,
        timestamp: new Date(),
      }),
    }),
  },
}));

const createSession = (userId: string): Session => ({
  user: {
    id: userId,
    permissions: [],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
});

const createCaller = (db: Database, session: Session | null) =>
  patchmonRouter.createCaller({
    db,
    deviceType: undefined,
    session,
  });

const createPatchMonIntegrationOnBoardAsync = async (
  db: Database,
  options: {
    isPublic: boolean;
    boardCreatorId: string;
  },
) => {
  const integrationId = createId();
  const boardId = createId();
  const itemId = createId();

  await db.insert(integrations).values({
    id: integrationId,
    kind: "patchmon",
    name: "PatchMon",
    url: "https://patchmon.example.com",
  });

  await db.insert(boards).values({
    id: boardId,
    name: "patchmon-board",
    creatorId: options.boardCreatorId,
    isPublic: options.isPublic,
  });

  await db.insert(items).values({
    id: itemId,
    kind: "patchmon",
    boardId,
    options: "{}",
  });

  await db.insert(integrationItems).values({
    integrationId,
    itemId,
  });

  return { integrationId, boardId, itemId };
};

describe("patchmonRouter.getStats access control", () => {
  test("should throw UNAUTHORIZED for unauthenticated users even when integration is on a public board", async () => {
    const db = createDb();
    const otherUserId = createId();
    await db.insert(users).values({ id: otherUserId });
    const { integrationId } = await createPatchMonIntegrationOnBoardAsync(db, {
      isPublic: true,
      boardCreatorId: otherUserId,
    });
    const caller = createCaller(db, null);

    await expect(caller.getStats({ integrationId })).rejects.toThrow(
      new TRPCError({ code: "UNAUTHORIZED" }),
    );
  });

  test("should throw FORBIDDEN for authenticated users without board or integration access", async () => {
    const db = createDb();
    const boardOwnerId = createId();
    const sessionUserId = createId();
    await db.insert(users).values([{ id: boardOwnerId }, { id: sessionUserId }]);
    const { integrationId } = await createPatchMonIntegrationOnBoardAsync(db, {
      isPublic: false,
      boardCreatorId: boardOwnerId,
    });
    const caller = createCaller(db, createSession(sessionUserId));

    await expect(caller.getStats({ integrationId })).rejects.toThrow(
      new TRPCError({
        code: "FORBIDDEN",
        message: "User does not have permission to query at least one of the specified integration",
      }),
    );
  });

  test("should return stats for authenticated users when integration is on a public board", async () => {
    const db = createDb();
    const boardOwnerId = createId();
    const sessionUserId = createId();
    await db.insert(users).values([{ id: boardOwnerId }, { id: sessionUserId }]);
    const { integrationId } = await createPatchMonIntegrationOnBoardAsync(db, {
      isPublic: true,
      boardCreatorId: boardOwnerId,
    });
    const caller = createCaller(db, createSession(sessionUserId));

    const result = await caller.getStats({ integrationId });

    expect(result).toStrictEqual(samplePatchMonStats);
  });

  test("should return stats for authenticated users with integration use permission and no board placement", async () => {
    const db = createDb();
    const sessionUserId = createId();
    const integrationId = createId();
    await db.insert(users).values({ id: sessionUserId });
    await db.insert(integrations).values({
      id: integrationId,
      kind: "patchmon",
      name: "PatchMon",
      url: "https://patchmon.example.com",
    });
    await db.insert(integrationUserPermissions).values({
      integrationId,
      userId: sessionUserId,
      permission: "use",
    });
    const caller = createCaller(db, createSession(sessionUserId));

    const result = await caller.getStats({ integrationId });

    expect(result).toStrictEqual(samplePatchMonStats);
  });

  test("should throw NOT_FOUND when integration id does not exist", async () => {
    const db = createDb();
    const sessionUserId = createId();
    await db.insert(users).values({ id: sessionUserId });
    const caller = createCaller(db, createSession(sessionUserId));

    await expect(caller.getStats({ integrationId: createId() })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("should throw NOT_FOUND when integration is not a PatchMon integration", async () => {
    const db = createDb();
    const sessionUserId = createId();
    const integrationId = createId();
    await db.insert(users).values({ id: sessionUserId });
    await db.insert(integrations).values({
      id: integrationId,
      kind: "sonarr",
      name: "Sonarr",
      url: "https://sonarr.example.com",
    });
    await db.insert(integrationUserPermissions).values({
      integrationId,
      userId: sessionUserId,
      permission: "use",
    });
    const caller = createCaller(db, createSession(sessionUserId));

    await expect(caller.getStats({ integrationId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
