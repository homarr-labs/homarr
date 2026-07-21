import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

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
