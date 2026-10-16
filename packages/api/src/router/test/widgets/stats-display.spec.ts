import { describe, expect, onTestFinished, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { boards, boardUserPermissions, integrationItems, integrations, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

const calls = vi.hoisted(() => ({
  refresh: vi.fn(async () => undefined),
  snapshot: vi.fn(async () => ({ values: { count: 7 }, updatedAt: 123, retryAt: 0, error: false, stale: false })),
}));
vi.mock("@homarr/request-handler/stats", () => ({
  refreshStatsAsync: calls.refresh,
  getStatsSnapshotAsync: calls.snapshot,
}));

import { createCallerFactory } from "../../../procedure";
import { statsRouter } from "../../widgets/stats";

describe("statistics display reads", () => {
  test("uses query permissions and the bounded non-forced refresh before reading the snapshot", async () => {
    const db = createDb();
    onTestFinished(() => {
      db.$client.close();
    });
    await db.insert(users).values([{ id: "display-owner" }, { id: "display-viewer" }]);
    await db
      .insert(boards)
      .values({ id: "display-board", name: "Display", creatorId: "display-owner", isPublic: false });
    await db
      .insert(boardUserPermissions)
      .values({ boardId: "display-board", userId: "display-viewer", permission: "view" });
    await db
      .insert(integrations)
      .values({ id: "display-integration", name: "Display", kind: "mock", url: "https://private.example" });
    await db.insert(items).values({ id: "display-item", kind: "stats", boardId: "display-board", options: "{}" });
    await db.insert(integrationItems).values({ integrationId: "display-integration", itemId: "display-item" });
    const session: Session = {
      expires: "2099-01-01",
      user: { id: "display-viewer", permissions: [], colorScheme: "auto" },
    };
    const viewer = createCallerFactory(statsRouter)({ db, session, deviceType: undefined });
    calls.refresh.mockClear();
    calls.snapshot.mockClear();

    await expect(viewer.displaySnapshot({ integrationId: "display-integration" })).resolves.toEqual({
      values: { count: 7 },
      updatedAt: 123,
      retryAt: 0,
      error: false,
      stale: false,
    });
    expect(calls.refresh).toHaveBeenCalledWith(expect.objectContaining({ id: "display-integration" }), false);
    expect(calls.refresh.mock.invocationCallOrder[0]).toBeLessThan(calls.snapshot.mock.invocationCallOrder[0] ?? 0);
    expect(statsRouter.displaySnapshot["~orpc"].meta.operationType).toBe("query");
    expect(calls.snapshot).toHaveBeenCalledOnce();

    const anonymous = createCallerFactory(statsRouter)({ db, session: null, deviceType: undefined });
    await expect(anonymous.displaySnapshot({ integrationId: "display-integration" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(calls.refresh).toHaveBeenCalledOnce();
  });
});
