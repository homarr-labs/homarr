import { describe, expect, test, vi } from "vitest";

import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { boards, integrationItems, integrations, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { KomodoOverview } from "@homarr/integrations";

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

vi.mock("@homarr/request-handler/komodo", () => ({
  komodoOverviewRequestHandler: {
    handler: () => ({
      getDataAsync: async () => ({ data: sampleOverview, timestamp: updatedAt }),
    }),
  },
}));

const createKomodoIntegrationOnPublicBoardAsync = async (db: Database) => {
  const ownerId = createId();
  const integrationId = createId();
  const boardId = createId();
  const itemId = createId();

  await db.insert(users).values({ id: ownerId });
  await db.insert(integrations).values({
    id: integrationId,
    kind: "komodo",
    name: "Komodo",
    url: "https://komodo.example.com",
  });
  await db.insert(boards).values({
    id: boardId,
    name: "komodo-board",
    creatorId: ownerId,
    isPublic: true,
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
    const integrationId = await createKomodoIntegrationOnPublicBoardAsync(db);
    const caller = komodoRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
    });

    await expect(caller.getOverview({ integrationId })).resolves.toStrictEqual({
      overview: sampleOverview,
      updatedAt,
    });
  });
});
