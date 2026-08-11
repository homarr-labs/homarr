import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { boards, integrationItems, integrations, integrationUserPermissions, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { KomodoOverview, KomodoServerOverviewItem } from "@homarr/integrations";

import { komodoRouter } from "../../widgets/komodo";

const sampleOverview = {
  servers: { total: 2, healthy: 1, warning: 0, error: 1, unknown: 0 },
  stacks: { total: 3, healthy: 2, warning: 1, error: 0, unknown: 0 },
  deployments: { total: 4, healthy: 3, warning: 0, error: 0, unknown: 1 },
  problemCount: 3,
  problems: [
    { id: "server-2", name: "Offline", state: "NotOk", status: "error", kind: "server" },
    { id: "stack-3", name: "Deploying", state: "deploying", status: "warning", kind: "stack" },
    { id: "deployment-4", name: "Unknown", state: "future_state", status: "unknown", kind: "deployment" },
  ],
} satisfies KomodoOverview;

const updatedAt = new Date("2026-08-11T12:00:00.000Z");

const sampleServers = [
  {
    id: "server-1",
    name: "Production",
    state: "Ok",
    status: "healthy",
    version: "2.3.1",
    physicalCoreCount: 4,
    logicalCoreCount: 8,
    stats: {
      cpuPercentage: 33.3,
      loadAverage: { one: 0.21, five: 0.32, fifteen: 0.31 },
      memoryUsedGb: 4.7,
      memoryTotalGb: 10,
      diskUsedGb: 92.2,
      diskTotalGb: 100,
      networkIngressBytesPerSecond: 102.4,
      networkEgressBytesPerSecond: 6.4,
    },
  },
] satisfies KomodoServerOverviewItem[];

vi.mock("@homarr/request-handler/komodo", () => ({
  komodoOverviewRequestHandler: {
    handler: () => ({
      getDataAsync: async () => ({ data: sampleOverview, timestamp: updatedAt }),
    }),
  },
  komodoServerOverviewRequestHandler: {
    handler: () => ({
      getDataAsync: async () => ({ data: sampleServers, timestamp: updatedAt }),
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
  komodoRouter.createCaller({
    db,
    deviceType: undefined,
    session,
  });

const createKomodoIntegrationOnBoardAsync = async (
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
    kind: "komodo",
    name: "Komodo",
    url: "https://komodo.example.com",
  });
  await db.insert(boards).values({
    id: boardId,
    name: "komodo-board",
    creatorId: options.boardCreatorId,
    isPublic: options.isPublic,
  });
  await db.insert(items).values({
    id: itemId,
    kind: "komodo",
    boardId,
    options: "{}",
  });
  await db.insert(integrationItems).values({ integrationId, itemId });

  return integrationId;
};

describe("komodoRouter.getOverview", () => {
  test("returns transformed overview data for the widget", async () => {
    const db = createDb();
    const ownerId = createId();
    await db.insert(users).values({ id: ownerId });
    const integrationId = await createKomodoIntegrationOnBoardAsync(db, {
      isPublic: true,
      boardCreatorId: ownerId,
    });
    const caller = createCaller(db, null);

    await expect(caller.getOverview({ integrationId })).resolves.toStrictEqual({
      overview: sampleOverview,
      updatedAt,
    });
  });
});

describe("komodoRouter.getServers", () => {
  test("returns Komodo server metrics for the widget", async () => {
    const db = createDb();
    const ownerId = createId();
    await db.insert(users).values({ id: ownerId });
    const integrationId = await createKomodoIntegrationOnBoardAsync(db, {
      isPublic: true,
      boardCreatorId: ownerId,
    });
    const caller = createCaller(db, null);

    await expect(caller.getServers({ integrationId })).resolves.toStrictEqual({
      servers: sampleServers,
      updatedAt,
    });
  });
});

describe("komodoRouter access control", () => {
  test("rejects unauthenticated users when the integration is only on a private board", async () => {
    const db = createDb();
    const ownerId = createId();
    await db.insert(users).values({ id: ownerId });
    const integrationId = await createKomodoIntegrationOnBoardAsync(db, {
      isPublic: false,
      boardCreatorId: ownerId,
    });

    await expect(createCaller(db, null).getOverview({ integrationId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("rejects unauthenticated server queries when the integration is only on a private board", async () => {
    const db = createDb();
    const ownerId = createId();
    await db.insert(users).values({ id: ownerId });
    const integrationId = await createKomodoIntegrationOnBoardAsync(db, {
      isPublic: false,
      boardCreatorId: ownerId,
    });

    await expect(createCaller(db, null).getServers({ integrationId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("rejects authenticated users without board or integration access", async () => {
    const db = createDb();
    const ownerId = createId();
    const userId = createId();
    await db.insert(users).values([{ id: ownerId }, { id: userId }]);
    const integrationId = await createKomodoIntegrationOnBoardAsync(db, {
      isPublic: false,
      boardCreatorId: ownerId,
    });

    await expect(createCaller(db, createSession(userId)).getOverview({ integrationId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  test("allows authenticated users with explicit integration use access", async () => {
    const db = createDb();
    const userId = createId();
    const integrationId = createId();
    await db.insert(users).values({ id: userId });
    await db.insert(integrations).values({
      id: integrationId,
      kind: "komodo",
      name: "Komodo",
      url: "https://komodo.example.com",
    });
    await db.insert(integrationUserPermissions).values({
      integrationId,
      userId,
      permission: "use",
    });

    await expect(createCaller(db, createSession(userId)).getOverview({ integrationId })).resolves.toStrictEqual({
      overview: sampleOverview,
      updatedAt,
    });
  });

  test("returns NOT_FOUND for an unknown integration id", async () => {
    const db = createDb();

    await expect(createCaller(db, null).getOverview({ integrationId: createId() })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("returns NOT_FOUND for an integration of another kind", async () => {
    const db = createDb();
    const userId = createId();
    const integrationId = createId();
    await db.insert(users).values({ id: userId });
    await db.insert(integrations).values({
      id: integrationId,
      kind: "sonarr",
      name: "Sonarr",
      url: "https://sonarr.example.com",
    });
    await db.insert(integrationUserPermissions).values({
      integrationId,
      userId,
      permission: "use",
    });

    await expect(createCaller(db, createSession(userId)).getOverview({ integrationId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
