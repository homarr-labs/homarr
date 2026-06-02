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
  queryCacheRetentionMs,
} from "@homarr/api/query-cache";

import { queryCacheRouter } from "../router/query-cache";

const redisMock = vi.hoisted(() => {
  const values = new Map<string, { value: string; expiresAt: number }>();
  const calls: {
    userId: string;
    boardId: string;
    key: string;
    ttlMs: number;
    maxValueBytes: number;
  }[] = [];

  return {
    values,
    calls,
    createQueryCacheChannel: vi.fn(
      (options: { userId: string; boardId: string; key: string; ttlMs: number; maxValueBytes: number }) => {
        calls.push(options);
        const storageKey = `${options.userId}:${options.boardId}:${options.key}`;

        return {
          getAsync: async () => {
            const item = values.get(storageKey);
            if (!item) return null;
            if (Date.now() > item.expiresAt) {
              values.delete(storageKey);
              return null;
            }

            return item.value;
          },
          setAsync: async (value: string) => {
            if (Buffer.byteLength(value, "utf8") > options.maxValueBytes) {
              return false;
            }

            values.set(storageKey, { value, expiresAt: Date.now() + options.ttlMs });
            return true;
          },
          removeAsync: async () => {
            values.delete(storageKey);
          },
        };
      },
    ),
  };
});

vi.mock("@homarr/redis", () => ({
  createQueryCacheChannel: redisMock.createQueryCacheChannel,
}));

vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

afterEach(() => {
  vi.useRealTimers();
  redisMock.values.clear();
  redisMock.calls.length = 0;
  redisMock.createQueryCacheChannel.mockClear();
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
  test("stores, reads, and removes data for a board viewer", async () => {
    const db = createDb();
    const session = createSession();
    await insertUserAsync(db, session.user.id);
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: session.user.id, isPublic: false });

    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session });

    await expect(caller.setItem({ boardId: "board-1", key: "query-key", value: "cached-value" })).resolves.toEqual({
      stored: true,
    });
    await expect(caller.getItem({ boardId: "board-1", key: "query-key" })).resolves.toBe("cached-value");

    await caller.removeItem({ boardId: "board-1", key: "query-key" });

    await expect(caller.getItem({ boardId: "board-1", key: "query-key" })).resolves.toBeNull();
  });

  test("does not touch Redis when board access is denied", async () => {
    const db = createDb();
    await insertUserAsync(db, "owner");
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: "owner", isPublic: false });

    redisMock.createQueryCacheChannel.mockClear();
    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session: createSession("other-user") });

    await expect(caller.getItem({ boardId: "board-1", key: "query-key" })).rejects.toThrow("Board not found");
    expect(redisMock.createQueryCacheChannel).not.toHaveBeenCalled();
  });

  test("scopes anonymous public-board cache entries by anonymous user and board", async () => {
    const db = createDb();
    await insertUserAsync(db, "owner");
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: "owner", isPublic: true });

    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session: null });

    await caller.setItem({ boardId: "board-1", key: "query-key", value: "cached-value" });

    expect(redisMock.calls.at(-1)).toMatchObject({
      userId: "anonymous",
      boardId: "board-1",
      key: "query-key",
      ttlMs: queryCacheRetentionMs,
      maxValueBytes: queryCacheMaxValueBytes,
    });
  });

  test("scopes signed-in cache entries by user and rejects oversized values", async () => {
    const db = createDb();
    const session = createSession("user-1");
    await insertUserAsync(db, session.user.id);
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: session.user.id, isPublic: false });

    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session });
    const value = "x".repeat(queryCacheMaxValueBytes + 1);

    await expect(caller.setItem({ boardId: "board-1", key: "query-key", value })).resolves.toEqual({
      stored: false,
    });
    expect(redisMock.calls.at(-1)).toMatchObject({
      userId: "user-1",
      boardId: "board-1",
      ttlMs: queryCacheRetentionMs,
      maxValueBytes: queryCacheMaxValueBytes,
    });
  });

  test("expires values through the Redis TTL path", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const db = createDb();
    const session = createSession("user-1");
    await insertUserAsync(db, session.user.id);
    await db.insert(boards).values({ id: "board-1", name: "board", creatorId: session.user.id, isPublic: false });

    const caller = queryCacheRouter.createCaller({ db, deviceType: undefined, session });

    await caller.setItem({ boardId: "board-1", key: "query-key", value: "cached-value" });
    await expect(caller.getItem({ boardId: "board-1", key: "query-key" })).resolves.toBe("cached-value");

    await vi.advanceTimersByTimeAsync(queryCacheRetentionMs + 1);

    await expect(caller.getItem({ boardId: "board-1", key: "query-key" })).resolves.toBeNull();
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
