import { dehydrate, QueryClient } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createSessionQueryPersistence,
  getQueryPersistenceStorageKey,
  queryPersistenceBuster,
  shouldPersistDashboardQuery,
} from "./query-persistence";

const createSuccessfulQuery = (queryKey: readonly unknown[], data: unknown) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKey, data);
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
});

describe("dashboard query persistence", () => {
  test("keeps usable dashboard data and skips volatile or unrelated queries", () => {
    const widget = createSuccessfulQuery([["widget", "weather", "atLocation"], { type: "query" }], { temp: 21 });
    const supporting = createSuccessfulQuery([["app", "byIds"], { type: "query" }], [{ id: "app-1" }]);
    const ping = createSuccessfulQuery([["widget", "app", "ping"], { type: "query" }], { status: "online" });
    const beszel = createSuccessfulQuery([["widget", "beszel", "getSystemStats"], { type: "query" }], []);
    const customApi = createSuccessfulQuery([["widget", "customApi", "getData"], { type: "query" }], {
      apiKey: "secret",
    });
    const unrelated = createSuccessfulQuery([["board", "getBoardByName"], { type: "query" }], { name: "Home" });
    const pendingClient = new QueryClient();
    const pending = pendingClient.getQueryCache().build(pendingClient, {
      queryKey: [["widget", "calendar", "findAllEvents"], { type: "query" }],
      queryFn: () => Promise.resolve([]),
    });
    const failed = createSuccessfulQuery([["widget", "calendar", "findAllEvents"], { type: "query" }], []);
    failed.query.setState({ ...failed.query.state, error: new Error("refresh failed"), status: "error" });

    expect(shouldPersistDashboardQuery(widget.query)).toBe(true);
    expect(shouldPersistDashboardQuery(supporting.query)).toBe(true);
    expect(shouldPersistDashboardQuery(ping.query)).toBe(false);
    expect(shouldPersistDashboardQuery(beszel.query)).toBe(false);
    expect(shouldPersistDashboardQuery(customApi.query)).toBe(false);
    expect(shouldPersistDashboardQuery(unrelated.query)).toBe(false);
    expect(shouldPersistDashboardQuery(pending)).toBe(false);
    expect(shouldPersistDashboardQuery(failed.query)).toBe(true);
  });

  test("round-trips dashboard data with SuperJSON in an isolated session scope", async () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const userA = createSessionQueryPersistence("user-a", storage);
    const userB = createSessionQueryPersistence("user-b", storage);
    const { queryClient } = createSuccessfulQuery([["widget", "calendar", "findAllEvents"], { type: "query" }], {
      startsAt: new Date("2026-08-22T12:00:00.000Z"),
    });
    const cachedQuery = queryClient.getQueryCache().find({
      queryKey: [["widget", "calendar", "findAllEvents"], { type: "query" }],
    });
    if (!cachedQuery) throw new Error("Expected cached query to be present");
    cachedQuery.setState({ ...cachedQuery.state, error: new Error("refresh failed"), status: "error" });
    queryClient.getMutationCache().build(
      queryClient,
      { mutationKey: ["integration", "create"], mutationFn: async () => undefined },
      {
        context: undefined,
        data: undefined,
        error: null,
        failureCount: 0,
        failureReason: null,
        isPaused: true,
        status: "pending",
        submittedAt: Date.now(),
        variables: { apiKey: "secret" },
      },
    );
    const persistedClient: PersistedClient = {
      timestamp: Date.now(),
      buster: queryPersistenceBuster,
      clientState: dehydrate(queryClient, userA.dehydrateOptions),
    };

    expect(persistedClient.clientState.mutations).toHaveLength(0);

    await userA.persister.persistClient(persistedClient);
    await vi.advanceTimersByTimeAsync(1_000);

    const restored = await userA.persister.restoreClient();
    expect(restored?.clientState.queries[0]?.state.data).toEqual({
      startsAt: new Date("2026-08-22T12:00:00.000Z"),
    });
    expect(restored?.clientState.queries[0]?.state.status).toBe("success");
    expect(restored?.clientState.queries[0]?.state.error).toBeNull();
    expect(await userB.persister.restoreClient()).toBeUndefined();

    await userA.persister.removeClient();
    expect(storage.getItem(getQueryPersistenceStorageKey("user-a"))).toBeNull();
  });

  test("treats unavailable session storage as an empty cache", async () => {
    const blockedStorage = createMemoryStorage();
    blockedStorage.getItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    blockedStorage.removeItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };

    const persistence = createSessionQueryPersistence("blocked", blockedStorage);
    expect(await persistence.persister.restoreClient()).toBeUndefined();
    expect(() => persistence.persister.removeClient()).not.toThrow();
  });
});
