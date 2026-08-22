// @vitest-environment jsdom

import { dehydrate, QueryClient } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { persistQueryClientRestore, removeOldestQuery } from "@tanstack/react-query-persist-client";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createSessionQueryPersister,
  getQueryPersistenceBuster,
  getQueryPersistenceStorageKey,
  queryPersistenceMaxDataBytes,
  removeSessionQueryCache,
  scheduleRestoredDashboardQueryRefresh,
  shouldPersistDashboardQuery,
} from "./query-persistence";

const createSuccessfulQuery = (queryKey: readonly unknown[], data: unknown, updatedAt = Date.now()) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKey, data, { updatedAt });
  const query = queryClient.getQueryCache().find({ queryKey });
  if (!query) throw new Error("Expected query to be present");
  return { query, queryClient };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("widget query persistence", () => {
  test("persists successful dashboard data but not unrelated, ping, pending, or oversized queries", () => {
    const widget = createSuccessfulQuery([["widget", "weather", "getWeather"], { type: "query" }], { temp: 21 });
    const supporting = createSuccessfulQuery([["app", "byIds"], { type: "query" }], [{ id: "app-1" }]);
    const unrelated = createSuccessfulQuery([["board", "getBoardByName"], { type: "query" }], { name: "Home" });
    const ping = createSuccessfulQuery([["widget", "app", "ping"], { type: "query" }], { status: "online" });
    const oversized = createSuccessfulQuery([["widget", "example"], { type: "query" }], {
      value: "x".repeat(queryPersistenceMaxDataBytes + 1),
    });
    const pendingClient = new QueryClient();
    const pending = pendingClient.getQueryCache().build(pendingClient, {
      queryKey: [["widget", "calendar", "findAllEvents"], { type: "query" }],
      queryFn: () => Promise.resolve([]),
    });

    expect(shouldPersistDashboardQuery(widget.query)).toBe(true);
    expect(shouldPersistDashboardQuery(supporting.query)).toBe(true);
    expect(shouldPersistDashboardQuery(unrelated.query)).toBe(false);
    expect(shouldPersistDashboardQuery(ping.query)).toBe(false);
    expect(shouldPersistDashboardQuery(oversized.query)).toBe(false);
    expect(shouldPersistDashboardQuery(pending)).toBe(false);
  });

  test("uses stable, isolated storage keys for anonymous and authenticated scopes", () => {
    expect(getQueryPersistenceStorageKey("user-a")).toBe(getQueryPersistenceStorageKey("user-a"));
    expect(getQueryPersistenceStorageKey("user-a")).not.toBe(getQueryPersistenceStorageKey("user-b"));
    expect(getQueryPersistenceStorageKey(null)).not.toBe(getQueryPersistenceStorageKey("user-a"));
    expect(getQueryPersistenceStorageKey("user-a")).not.toContain("user-a");

    const userAKey = getQueryPersistenceStorageKey("user-a");
    const userBKey = getQueryPersistenceStorageKey("user-b");
    window.sessionStorage.setItem(userAKey, "a");
    window.sessionStorage.setItem(userBKey, "b");
    removeSessionQueryCache("user-a");
    expect(window.sessionStorage.getItem(userAKey)).toBeNull();
    expect(window.sessionStorage.getItem(userBKey)).toBe("b");
  });

  test("round-trips SuperJSON data, strips refresh errors, and removes corrupted storage", async () => {
    vi.useFakeTimers();
    const scope = "user-a";
    const key = getQueryPersistenceStorageKey(scope);
    const persister = createSessionQueryPersister(scope);
    const { query, queryClient } = createSuccessfulQuery([["widget", "calendar", "findAllEvents"], { type: "query" }], {
      startsAt: new Date("2026-08-22T12:00:00.000Z"),
    });
    query.setState({ ...query.state, error: new Error("private refresh error"), status: "error" });
    expect(shouldPersistDashboardQuery(query)).toBe(true);
    const persistedClient: PersistedClient = {
      timestamp: Date.now(),
      buster: getQueryPersistenceBuster(scope),
      clientState: dehydrate(queryClient, { shouldDehydrateQuery: shouldPersistDashboardQuery }),
    };

    void persister.persistClient(persistedClient);
    await vi.advanceTimersByTimeAsync(1_000);
    const restored = await persister.restoreClient();
    const restoredData = restored?.clientState.queries[0]?.state.data as { startsAt?: Date } | undefined;
    expect(restoredData?.startsAt).toEqual(new Date("2026-08-22T12:00:00.000Z"));
    expect(restored?.clientState.queries[0]?.state.status).toBe("success");
    expect(restored?.clientState.queries[0]?.state.error).toBeNull();
    expect(window.sessionStorage.getItem(key)).not.toContain("private refresh error");
    const restoredPredicate = persister.takeRestoredDashboardQueryPredicate();
    expect(restoredPredicate?.(query)).toBe(true);
    expect(persister.takeRestoredDashboardQueryPredicate()).toBeUndefined();

    window.sessionStorage.setItem(key, "not-valid-superjson");
    await expect(persister.restoreClient()).resolves.toBeUndefined();
    expect(window.sessionStorage.getItem(key)).toBeNull();
  });

  test.each([
    ["expired", 1, getQueryPersistenceBuster("user-a")],
    ["different buster", new Date("2026-08-22T12:00:00.000Z").getTime(), getQueryPersistenceBuster("user-b")],
  ])("discards %s cache entries", async (_case, timestamp, storedBuster) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    const scope = "user-a";
    const persister = createSessionQueryPersister(scope);
    const { queryClient } = createSuccessfulQuery([["widget", "weather", "getWeather"], { type: "query" }], {
      temp: 21,
    });
    void persister.persistClient({ timestamp, buster: storedBuster, clientState: dehydrate(queryClient) });
    await vi.advanceTimersByTimeAsync(1_000);

    const restoredClient = new QueryClient();
    await persistQueryClientRestore({
      queryClient: restoredClient,
      persister,
      maxAge: 5 * 60 * 1_000,
      buster: getQueryPersistenceBuster(scope),
    });

    expect(restoredClient.getQueryData([["widget", "weather", "getWeather"], { type: "query" }])).toBeUndefined();
    expect(window.sessionStorage.getItem(getQueryPersistenceStorageKey(scope))).toBeNull();
  });

  test("quota retry removes the oldest query first", () => {
    const old = createSuccessfulQuery([["widget", "old"], { type: "query" }], "old", 1);
    const recent = createSuccessfulQuery([["widget", "recent"], { type: "query" }], "recent", 2);
    const persistedClient: PersistedClient = {
      timestamp: Date.now(),
      buster: getQueryPersistenceBuster("user-a"),
      clientState: {
        mutations: [],
        queries: [...dehydrate(old.queryClient).queries, ...dehydrate(recent.queryClient).queries],
      },
    };

    const retried = removeOldestQuery({ persistedClient, error: new Error("quota"), errorCount: 1 });
    expect(retried?.clientState.queries).toHaveLength(1);
    expect(retried?.clientState.queries[0]?.queryKey).toEqual([["widget", "recent"], { type: "query" }]);
  });

  test("refreshes only restored cache data without awaiting the refresh", async () => {
    vi.useFakeTimers();
    const scope = "user-a";
    const queryKey = [["widget", "weather", "getWeather"], { type: "query" }] as const;
    const cached = createSuccessfulQuery(queryKey, { temp: 20 }, 10);
    const persister = createSessionQueryPersister(scope);
    void persister.persistClient({
      timestamp: Date.now(),
      buster: getQueryPersistenceBuster(scope),
      clientState: dehydrate(cached.queryClient),
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await persister.restoreClient();

    const fresh = createSuccessfulQuery(queryKey, { temp: 21 }, 20);
    const neverSettles = new Promise<void>(() => undefined);
    const invalidateQueries = vi.spyOn(fresh.queryClient, "invalidateQueries").mockReturnValue(neverSettles);

    expect(scheduleRestoredDashboardQueryRefresh(fresh.queryClient, persister)).toBeUndefined();
    expect(invalidateQueries).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(invalidateQueries).toHaveBeenCalledOnce();

    const predicate = invalidateQueries.mock.calls[0]?.[0]?.predicate;
    expect(predicate?.(cached.query)).toBe(true);
    expect(predicate?.(fresh.query)).toBe(false);
  });

  test("does not invalidate fresh queries when no cache was restored", async () => {
    vi.useFakeTimers();
    const persister = createSessionQueryPersister("empty");
    await persister.restoreClient();
    const fresh = createSuccessfulQuery([["widget", "weather", "getWeather"], { type: "query" }], { temp: 21 });
    const invalidateQueries = vi.spyOn(fresh.queryClient, "invalidateQueries");

    scheduleRestoredDashboardQueryRefresh(fresh.queryClient, persister);
    await vi.advanceTimersByTimeAsync(0);

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  test("treats blocked storage operations as an empty cache", async () => {
    const blockedStorage = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      removeItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    } as unknown as Storage;
    const persister = createSessionQueryPersister("blocked", blockedStorage);

    await expect(persister.restoreClient()).resolves.toBeUndefined();
    expect(() => persister.removeClient()).not.toThrow();
    expect(() => removeSessionQueryCache("blocked", blockedStorage)).not.toThrow();
  });

  test("treats an unavailable session storage getter as an empty cache", async () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(() => createSessionQueryPersister("blocked-getter")).not.toThrow();
    expect(() => removeSessionQueryCache("blocked-getter")).not.toThrow();
    await expect(createSessionQueryPersister("blocked-getter").restoreClient()).resolves.toBeUndefined();
  });
});
