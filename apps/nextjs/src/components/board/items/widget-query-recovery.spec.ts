import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import { isPersistableWidgetQueryKey } from "@homarr/api/query-cache";

import { createQueryCacheErrorCleanup } from "~/app/[locale]/_client-providers/query-cache-error-cleanup";
import { removePersistedWidgetQueries } from "./widget-query-recovery";

describe("removePersistedWidgetQueries", () => {
  test("removes stale widget queries and allows fresh data to be fetched", async () => {
    const queryClient = new QueryClient();
    const crashedWidgetQueryKey = [["widget", "mediaServer", "getCurrentStreams"], { input: {} }];
    const unrelatedQueryKey = [["user", "me"], { input: {} }];

    queryClient.setQueryData(crashedWidgetQueryKey, "stale");
    queryClient.setQueryData(unrelatedQueryKey, "unrelated");

    removePersistedWidgetQueries(queryClient);

    expect(queryClient.getQueryData(crashedWidgetQueryKey)).toBeUndefined();
    expect(queryClient.getQueryData(unrelatedQueryKey)).toBe("unrelated");
    await expect(
      queryClient.fetchQuery({ queryKey: crashedWidgetQueryKey, queryFn: () => Promise.resolve("fresh") }),
    ).resolves.toBe("fresh");
  });

  test("removes persisted queries outside the widget router", () => {
    const queryClient = new QueryClient();
    const dockerQueryKey = [["docker", "getContainers"], { input: {} }];
    const appQueryKey = [["app", "byId"], { input: {} }];
    const unrelatedQueryKey = [["user", "me"], { input: {} }];

    queryClient.setQueryData(dockerQueryKey, "stale");
    queryClient.setQueryData(appQueryKey, "stale");
    queryClient.setQueryData(unrelatedQueryKey, "unrelated");

    removePersistedWidgetQueries(queryClient);

    expect(queryClient.getQueryData(dockerQueryKey)).toBeUndefined();
    expect(queryClient.getQueryData(appQueryKey)).toBeUndefined();
    expect(queryClient.getQueryData(unrelatedQueryKey)).toBe("unrelated");
  });

  test("removes persisted widget queries when the widget kind and query path differ", () => {
    const queryClient = new QueryClient();
    const crashedWidgetQueryKey = [["widget", "anchorNotes", "getNote"], { input: {} }];
    const unrelatedQueryKey = [["user", "me"], { input: {} }];

    queryClient.setQueryData(crashedWidgetQueryKey, "stale");
    queryClient.setQueryData(unrelatedQueryKey, "unrelated");

    removePersistedWidgetQueries(queryClient);

    expect(queryClient.getQueryData(crashedWidgetQueryKey)).toBeUndefined();
    expect(queryClient.getQueryData(unrelatedQueryKey)).toBe("unrelated");
  });
});

describe("query cache error cleanup", () => {
  test("resets data when a persistable query transitions from success to error", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const unsubscribe = createQueryCacheErrorCleanup(queryClient);

    const widgetKey = [["widget", "mediaServer", "getCurrentStreams"], { input: {} }];
    const userKey = [["user", "me"], { input: {} }];

    queryClient.setQueryData(widgetKey, { old: true });
    queryClient.setQueryData(userKey, { user: true });

    await queryClient
      .fetchQuery({ queryKey: widgetKey, queryFn: () => Promise.reject(new Error("API down")) })
      .catch(() => {});

    expect(queryClient.getQueryData(widgetKey)).toBeUndefined();
    expect(queryClient.getQueryData(userKey)).toEqual({ user: true });

    unsubscribe();
  });

  test("preserves stale data for non-persistable query errors", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const unsubscribe = createQueryCacheErrorCleanup(queryClient);

    const boardKey = [["board", "getBoardByName"], { input: {} }];

    queryClient.setQueryData(boardKey, { boards: [] });

    await queryClient
      .fetchQuery({ queryKey: boardKey, queryFn: () => Promise.reject(new Error("API down")) })
      .catch(() => {});

    expect(queryClient.getQueryData(boardKey)).toEqual({ boards: [] });

    unsubscribe();
  });

  test("handles success→error→success→error cycling without getting stuck", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const unsubscribe = createQueryCacheErrorCleanup(queryClient);

    const widgetKey = [["widget", "mediaServer", "getCurrentStreams"], { input: {} }];

    queryClient.setQueryData(widgetKey, "first-success");
    await queryClient.fetchQuery({ queryKey: widgetKey, queryFn: () => Promise.resolve("second-success") });
    expect(queryClient.getQueryData(widgetKey)).toBe("second-success");

    await queryClient
      .fetchQuery({ queryKey: widgetKey, queryFn: () => Promise.reject(new Error("boom")) })
      .catch(() => {});
    expect(queryClient.getQueryData(widgetKey)).toBeUndefined();

    await queryClient.fetchQuery({ queryKey: widgetKey, queryFn: () => Promise.resolve("third-success") });
    expect(queryClient.getQueryData(widgetKey)).toBe("third-success");

    await queryClient
      .fetchQuery({ queryKey: widgetKey, queryFn: () => Promise.reject(new Error("boom-2")) })
      .catch(() => {});
    expect(queryClient.getQueryData(widgetKey)).toBeUndefined();

    unsubscribe();
  });

  test("unsubscribe stops processing further events", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const unsubscribe = createQueryCacheErrorCleanup(queryClient);

    const widgetKey = [["widget", "mediaServer", "getCurrentStreams"], { input: {} }];
    queryClient.setQueryData(widgetKey, "stale");

    unsubscribe();

    await queryClient
      .fetchQuery({ queryKey: widgetKey, queryFn: () => Promise.reject(new Error("API down")) })
      .catch(() => {});

    expect(queryClient.getQueryData(widgetKey)).toBe("stale");
  });
});

describe("rehydration marks persistable data as stale", () => {
  test("rehydrated queries are invalidated so they refetch on mount", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });

    const widgetKey = [["widget", "mediaServer", "getCurrentStreams"], { input: {} }];
    const userKey = [["user", "me"], { input: {} }];

    queryClient.setQueryData(widgetKey, { rehydrated: true });
    queryClient.setQueryData(userKey, { rehydrated: true });

    queryClient.invalidateQueries({ predicate: (query) => isPersistableWidgetQueryKey(query.queryKey) });

    expect(queryClient.getQueryState(widgetKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(userKey)?.isInvalidated).toBe(false);
  });
});
