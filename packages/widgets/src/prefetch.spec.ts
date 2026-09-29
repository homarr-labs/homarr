import { dehydrate } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeQueryClient } from "@homarr/api/shared";

import { prefetchForKind } from "./prefetch";
import { createTrpcQueryKey } from "./trpc-query-key";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@homarr/db", () => ({
  db: { query: { apps: { findMany: mocks.findMany } } },
  inArray: vi.fn(),
}));
vi.mock("@homarr/db/schema", () => ({ apps: { id: "id" } }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ error: vi.fn() }) }));

describe("board app data prefetch", () => {
  beforeEach(() => mocks.findMany.mockReset());

  it("hydrates pending app and bookmark queries before the batched database reads finish", async () => {
    const appResult = Promise.withResolvers<{ id: string; name: string }[]>();
    const bookmarkResult = Promise.withResolvers<{ id: string; name: string }[]>();
    mocks.findMany.mockReturnValueOnce(appResult.promise).mockReturnValueOnce(bookmarkResult.promise);
    const queryClient = makeQueryClient();
    const appKey = createTrpcQueryKey("app.byId", { id: "app-1" });
    const bookmarkKey = createTrpcQueryKey("app.byIds", ["app-1"]);

    prefetchForKind("app", queryClient, [{ options: { appId: "app-1" } }]);
    prefetchForKind("bookmarks", queryClient, [{ options: { items: ["app-1"] } }]);

    const dehydrated = dehydrate(queryClient);
    expect(dehydrated.queries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: appKey, state: expect.objectContaining({ status: "pending" }) }),
        expect.objectContaining({ queryKey: bookmarkKey, state: expect.objectContaining({ status: "pending" }) }),
      ]),
    );
    expect(dehydrated.queries.every((query) => query.promise instanceof Promise)).toBe(true);

    appResult.resolve([{ id: "app-1", name: "App" }]);
    bookmarkResult.resolve([{ id: "app-1", name: "App" }]);
    await vi.waitFor(() => {
      expect(queryClient.getQueryData(appKey)).toEqual({ id: "app-1", name: "App" });
      expect(queryClient.getQueryData(bookmarkKey)).toEqual([{ id: "app-1", name: "App" }]);
    });
    expect(mocks.findMany).toHaveBeenCalledTimes(2);
  });
});
