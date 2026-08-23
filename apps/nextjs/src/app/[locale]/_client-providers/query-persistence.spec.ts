import { dehydrate, QueryClient } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { persistQueryClientRestore } from "@tanstack/react-query-persist-client";
import { parse, stringify } from "superjson";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createSessionQueryPersister,
  getQueryPersistenceStorageKey,
  queryPersistenceBuster,
  queryPersistenceMaxDataBytes,
  shouldPersistDashboardQuery,
} from "./query-persistence";

const createSuccessfulQuery = (queryKey: readonly unknown[], data: unknown, updatedAt = Date.now()) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKey, data, { updatedAt });
  const query = queryClient.getQueryCache().find({ queryKey });
  if (!query) throw new Error("Expected query to be present");
  return { query, queryClient };
};

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
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

    const userAKey = getQueryPersistenceStorageKey("user-a");
    window.sessionStorage.setItem(userAKey, "a");
    createSessionQueryPersister("user-a").removeClient();
    expect(window.sessionStorage.getItem(userAKey)).toBeNull();
  });

  test("evicts every other scope so signing out cannot leave data behind", () => {
    const userAKey = getQueryPersistenceStorageKey("user-a");
    const anonymousKey = getQueryPersistenceStorageKey(null);
    window.sessionStorage.setItem(userAKey, "a");
    window.sessionStorage.setItem(anonymousKey, "anonymous");
    window.sessionStorage.setItem("unrelated", "kept");

    createSessionQueryPersister("user-b");

    expect(window.sessionStorage.getItem(userAKey)).toBeNull();
    expect(window.sessionStorage.getItem(anonymousKey)).toBeNull();
    expect(window.sessionStorage.getItem("unrelated")).toBe("kept");
  });

  test("never restores another session scope", async () => {
    const queryKey = [["widget", "weather", "getWeather"], { type: "query" }] as const;
    const { queryClient } = createSuccessfulQuery(queryKey, { temp: 21 });
    const userAPersister = createSessionQueryPersister("user-a");
    userAPersister.persistClient({
      timestamp: Date.now(),
      buster: queryPersistenceBuster,
      clientState: dehydrate(queryClient),
    });
    userAPersister.flush();
    expect((await userAPersister.restoreClient())?.clientState.queries).toHaveLength(1);

    expect(createSessionQueryPersister("user-b").restoreClient()).toBeUndefined();
  });

  test("stops persisting once the provider tears the cache down", async () => {
    const storage = createMemoryStorage();
    const persister = createSessionQueryPersister("user-a", storage);
    const { queryClient } = createSuccessfulQuery([["widget", "weather", "getWeather"], { type: "query" }], {
      temp: 21,
    });

    persister.persistClient({
      timestamp: Date.now(),
      buster: queryPersistenceBuster,
      clientState: dehydrate(queryClient),
    });
    persister.flush();
    persister.stop();

    persister.persistClient({
      timestamp: Date.now(),
      buster: queryPersistenceBuster,
      clientState: { mutations: [], queries: [] },
    });
    persister.flush();

    expect((await persister.restoreClient())?.clientState.queries).toHaveLength(1);
  });

  test("removes the cache instead of storing an empty one", () => {
    const scope = "user-a";
    const key = getQueryPersistenceStorageKey(scope);
    const persister = createSessionQueryPersister(scope);
    window.sessionStorage.setItem(key, "stale");

    persister.persistClient({
      timestamp: Date.now(),
      buster: queryPersistenceBuster,
      clientState: { mutations: [], queries: [] },
    });
    persister.flush();

    expect(window.sessionStorage.getItem(key)).toBeNull();
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
      buster: queryPersistenceBuster,
      clientState: dehydrate(queryClient, { shouldDehydrateQuery: shouldPersistDashboardQuery }),
    };

    persister.persistClient(persistedClient);
    persister.flush();
    const restored = await persister.restoreClient();
    const restoredData = restored?.clientState.queries[0]?.state.data as { startsAt?: Date } | undefined;
    expect(restoredData?.startsAt).toEqual(new Date("2026-08-22T12:00:00.000Z"));
    expect(restored?.clientState.queries[0]?.state.status).toBe("success");
    expect(restored?.clientState.queries[0]?.state.error).toBeNull();
    expect(restored?.clientState.queries[0]?.state.isInvalidated).toBe(true);
    expect(window.sessionStorage.getItem(key)).not.toContain("private refresh error");

    window.sessionStorage.setItem(key, "not-valid-superjson");
    expect(persister.restoreClient()).toBeUndefined();
    expect(window.sessionStorage.getItem(key)).toBeNull();
  });

  test("sanitizes structurally valid but unsafe stored state before hydration", async () => {
    const scope = "user-a";
    const key = getQueryPersistenceStorageKey(scope);
    const { queryClient } = createSuccessfulQuery(
      [["widget", "calendar", "findAllEvents"], { type: "query" }],
      [{ title: "safe" }],
    );
    const validQuery = dehydrate(queryClient).queries[0];
    if (!validQuery) throw new Error("Expected a dehydrated query");

    window.sessionStorage.setItem(
      key,
      stringify({
        timestamp: Date.now(),
        buster: queryPersistenceBuster,
        clientState: {
          mutations: [{ state: { status: "pending" } }],
          queries: [
            {
              ...validQuery,
              state: {
                ...validQuery.state,
                error: new Error("private refresh error"),
                fetchStatus: "fetching",
                status: "error",
              },
            },
            {
              ...validQuery,
              queryHash: "unrelated",
              queryKey: [["board", "getBoardByName"], { type: "query" }],
            },
            { queryHash: "malformed", queryKey: [["widget", "weather"]], state: null },
            {
              ...validQuery,
              queryHash: "missing-timestamp",
              state: { ...validQuery.state, dataUpdatedAt: undefined },
            },
          ],
        },
      }),
    );

    const restored = await createSessionQueryPersister(scope).restoreClient();
    expect(restored?.clientState.mutations).toEqual([]);
    expect(restored?.clientState.queries).toHaveLength(1);
    expect(restored?.clientState.queries[0]?.state.status).toBe("success");
    expect(restored?.clientState.queries[0]?.state.fetchStatus).toBe("idle");
    expect(restored?.clientState.queries[0]?.state.error).toBeNull();
  });

  test.each([
    ["expired", 1, queryPersistenceBuster],
    ["different buster", new Date("2026-08-22T12:00:00.000Z").getTime(), "old-version"],
    ["future timestamp", new Date("2026-08-22T12:00:00.000Z").getTime() + 1, queryPersistenceBuster],
  ])("discards %s cache entries", async (_case, timestamp, storedBuster) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
    const scope = "user-a";
    const persister = createSessionQueryPersister(scope);
    const { queryClient } = createSuccessfulQuery([["widget", "weather", "getWeather"], { type: "query" }], {
      temp: 21,
    });
    persister.persistClient({ timestamp, buster: storedBuster, clientState: dehydrate(queryClient) });
    persister.flush();

    const restoredClient = new QueryClient();
    await persistQueryClientRestore({
      queryClient: restoredClient,
      persister,
      maxAge: 5 * 60 * 1_000,
      buster: queryPersistenceBuster,
    });

    expect(restoredClient.getQueryData([["widget", "weather", "getWeather"], { type: "query" }])).toBeUndefined();
    expect(window.sessionStorage.getItem(getQueryPersistenceStorageKey(scope))).toBeNull();
  });

  test("quota retry writes the cache after evicting the oldest query", async () => {
    const old = createSuccessfulQuery([["widget", "old"], { type: "query" }], "old", 1);
    const recent = createSuccessfulQuery([["widget", "recent"], { type: "query" }], "recent", 2);
    const storage = createMemoryStorage();
    const setItem = storage.setItem.bind(storage);
    const setItemSpy = vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
      const client = parse<PersistedClient>(value);
      if (client.clientState.queries.length > 1) throw new DOMException("quota", "QuotaExceededError");
      setItem(key, value);
    });
    const persistedClient: PersistedClient = {
      timestamp: Date.now(),
      buster: queryPersistenceBuster,
      clientState: {
        mutations: [],
        queries: [...dehydrate(old.queryClient).queries, ...dehydrate(recent.queryClient).queries],
      },
    };
    const persister = createSessionQueryPersister("user-a", storage);

    persister.persistClient(persistedClient);
    persister.flush();

    expect(setItemSpy).toHaveBeenCalledTimes(2);
    const restored = await persister.restoreClient();
    expect(restored?.clientState.queries).toHaveLength(1);
    expect(restored?.clientState.queries[0]?.queryKey).toEqual([["widget", "recent"], { type: "query" }]);
  });

  test("coalesces pending writes and can synchronously flush the latest cache before reload", async () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const setItem = vi.spyOn(storage, "setItem");
    const queryKey = [["widget", "weather", "getWeather"], { type: "query" }] as const;
    const first = createSuccessfulQuery(queryKey, { temp: 20 }, 1);
    const latest = createSuccessfulQuery(queryKey, { temp: 21 }, 2);
    const persister = createSessionQueryPersister("user-a", storage);

    persister.persistClient({
      timestamp: Date.now(),
      buster: queryPersistenceBuster,
      clientState: dehydrate(first.queryClient),
    });
    persister.persistClient({
      timestamp: Date.now(),
      buster: queryPersistenceBuster,
      clientState: dehydrate(latest.queryClient),
    });

    expect(setItem).not.toHaveBeenCalled();
    persister.flush();
    expect(setItem).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(0);
    expect(setItem).toHaveBeenCalledOnce();

    const restored = await persister.restoreClient();
    expect(restored?.clientState.queries[0]?.state.data).toEqual({ temp: 21 });
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
    const { queryClient } = createSuccessfulQuery([["widget", "weather"], { type: "query" }], { temp: 21 });

    expect(persister.restoreClient()).toBeUndefined();
    expect(() => {
      persister.persistClient({
        timestamp: Date.now(),
        buster: queryPersistenceBuster,
        clientState: dehydrate(queryClient),
      });
      persister.flush();
    }).not.toThrow();
    expect(() => persister.removeClient()).not.toThrow();
  });

  test("treats an unavailable session storage getter as an empty cache", async () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(() => createSessionQueryPersister("blocked-getter")).not.toThrow();
    expect(createSessionQueryPersister("blocked-getter").restoreClient()).toBeUndefined();
  });
});
