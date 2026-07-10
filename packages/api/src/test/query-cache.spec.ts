import { afterEach, describe, expect, test, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import { boards, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import {
  isPersistableWidgetQueryKey,
  queryCacheDefaultStaleTimeMs,
  queryCacheMaxValueBytes,
} from "@homarr/api/query-cache";

import { queryCacheRouter } from "../router/query-cache";

const redisMock = vi.hoisted(() => {
  const values = new Map<string, string>();

  return {
    values,
    setQueryCacheAsync: vi.fn(
      async (_userId: string, _boardId: string, value: string, _ttlMs: number, maxValueBytes: number) => {
        if (Buffer.byteLength(value, "utf8") > maxValueBytes) return false;
        values.set(`${_userId}:${_boardId}`, value);
        return true;
      },
    ),
    removeQueryCacheAsync: vi.fn(async (_userId: string, _boardId: string) => {
      values.delete(`${_userId}:${_boardId}`);
    }),
  };
});

vi.mock("@homarr/redis", () => ({
  setQueryCacheAsync: redisMock.setQueryCacheAsync,
  removeQueryCacheAsync: redisMock.removeQueryCacheAsync,
}));

vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

afterEach(() => {
  vi.useRealTimers();
  redisMock.values.clear();
  redisMock.setQueryCacheAsync.mockClear();
  redisMock.removeQueryCacheAsync.mockClear();
});

const createSession = (userId = createId()): Session => ({
  user: {
    id: userId,
    permissions: [],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
});

const insertUserAsync = async (db: Database, id: string) => {
  await db.insert(users).values({ id });
};

describe("isPersistableWidgetQueryKey", () => {
  test.each([
    [[["widget", "calendar", "findAllEvents"], { type: "query" }], true],
    [[["app", "byId"], { type: "query" }], true],
    [[["app", "byIds"], { type: "query" }], true],
    [[["docker", "getContainers"], { type: "query" }], true],
    [[["integration", "byIds"], { type: "query" }], true],
    [[["widget", "app", "ping"], { type: "query", input: { id: "abc" } }], false],
    [[["app", "selectable"], { type: "query" }], false],
    [[["board", "getBoardByName"], { type: "query" }], false],
    [["widget"], false],
  ])("matches persist filter for %j", (queryKey, expected) => {
    expect(isPersistableWidgetQueryKey(queryKey)).toBe(expected);
  });
});

describe("queryCacheRouter", () => {
  test("stores and removes data for a board viewer", async () => {
    const db = createDb();
    const session = createSession();
    await insertUserAsync(db, session.user.id);
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: session.user.id, isPublic: false });

    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session });

    await expect(caller.setItem({ boardId: "board-1", value: "cached-value" })).resolves.toEqual({
      stored: true,
    });
    expect(redisMock.setQueryCacheAsync).toHaveBeenCalledWith(
      session.user.id,
      "board-1",
      "cached-value",
      expect.any(Number),
      queryCacheMaxValueBytes,
    );

    await caller.removeItem({ boardId: "board-1" });
    expect(redisMock.removeQueryCacheAsync).toHaveBeenCalledWith(session.user.id, "board-1");
  });

  test("does not touch Redis when board access is denied", async () => {
    const db = createDb();
    await insertUserAsync(db, "owner");
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: "owner", isPublic: false });

    redisMock.setQueryCacheAsync.mockClear();
    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session: createSession("other-user") });

    await expect(caller.setItem({ boardId: "board-1", value: "cached-value" })).rejects.toThrow("Board not found");
    expect(redisMock.setQueryCacheAsync).not.toHaveBeenCalled();
  });

  test("scopes anonymous public-board cache entries by anonymous user", async () => {
    const db = createDb();
    await insertUserAsync(db, "owner");
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: "owner", isPublic: true });

    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session: null });

    await caller.setItem({ boardId: "board-1", value: "cached-value" });

    expect(redisMock.setQueryCacheAsync).toHaveBeenCalledWith(
      "anonymous",
      "board-1",
      "cached-value",
      expect.any(Number),
      queryCacheMaxValueBytes,
    );
  });

  test("rejects oversized values", async () => {
    const db = createDb();
    const session = createSession("user-1");
    await insertUserAsync(db, session.user.id);
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: session.user.id, isPublic: false });

    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session });
    const value = "x".repeat(queryCacheMaxValueBytes + 1);

    await expect(caller.setItem({ boardId: "board-1", value })).resolves.toEqual({
      stored: false,
    });
  });
});

describe("query cache stale handling", () => {
  test("uses TanStack Query dataUpdatedAt and staleTime to decide when cached data refetches", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:10:00.000Z"));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: queryCacheDefaultStaleTimeMs,
        },
      },
    });
    const queryKey = [["widget", "example"], { input: { integrationIds: ["integration-1"] }, type: "query" }];
    const queryFn = vi.fn().mockResolvedValue("fresh");

    queryClient.setQueryData(queryKey, "cached", {
      updatedAt: Date.now() - queryCacheDefaultStaleTimeMs - 1,
    });

    await expect(
      queryClient.fetchQuery({
        queryKey,
        queryFn,
      }),
    ).resolves.toBe("fresh");

    expect(queryFn).toHaveBeenCalledOnce();
  });
});
