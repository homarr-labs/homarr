import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import { removeWidgetDataQueries } from "./widget-query-recovery";

describe("removeWidgetDataQueries", () => {
  test("removes only the failed widget prefix and allows fresh data to be fetched", async () => {
    const queryClient = new QueryClient();
    const crashedWidgetQueryKey = [["widget", "mediaServer", "getCurrentStreams"], { input: {} }];
    const sameWidgetQueryKey = [["widget", "mediaServer", "getLibraries"], { input: {} }];
    const unrelatedWidgetQueryKey = [["widget", "calendar", "getEvents"], { input: {} }];
    const appQueryKey = [["app", "byId"], { input: {} }];
    const unrelatedQueryKey = [["user", "me"], { input: {} }];

    queryClient.setQueryData(crashedWidgetQueryKey, "stale");
    queryClient.setQueryData(sameWidgetQueryKey, "related");
    queryClient.setQueryData(unrelatedWidgetQueryKey, "other-widget");
    queryClient.setQueryData(appQueryKey, "app");
    queryClient.setQueryData(unrelatedQueryKey, "unrelated");

    removeWidgetDataQueries(queryClient, [[["widget", "mediaServer"]]]);

    expect(queryClient.getQueryData(crashedWidgetQueryKey)).toBeUndefined();
    expect(queryClient.getQueryData(sameWidgetQueryKey)).toBeUndefined();
    expect(queryClient.getQueryData(unrelatedWidgetQueryKey)).toBe("other-widget");
    expect(queryClient.getQueryData(appQueryKey)).toBe("app");
    expect(queryClient.getQueryData(unrelatedQueryKey)).toBe("unrelated");
    await expect(
      queryClient.fetchQuery({ queryKey: crashedWidgetQueryKey, queryFn: () => Promise.resolve("fresh") }),
    ).resolves.toBe("fresh");
  });

  test("uses an explicit supporting query prefix without purging other supporting data", () => {
    const queryClient = new QueryClient();
    const dockerQueryKey = [["docker", "getContainers"], { input: {} }];
    const appQueryKey = [["app", "byId"], { input: {} }];
    const unrelatedQueryKey = [["user", "me"], { input: {} }];

    queryClient.setQueryData(dockerQueryKey, "stale");
    queryClient.setQueryData(appQueryKey, "stale");
    queryClient.setQueryData(unrelatedQueryKey, "unrelated");

    removeWidgetDataQueries(queryClient, [[["docker", "getContainers"]]]);

    expect(queryClient.getQueryData(dockerQueryKey)).toBeUndefined();
    expect(queryClient.getQueryData(appQueryKey)).toBe("stale");
    expect(queryClient.getQueryData(unrelatedQueryKey)).toBe("unrelated");
  });

  test("uses the definition query prefix when the widget kind and query path differ", () => {
    const queryClient = new QueryClient();
    const crashedWidgetQueryKey = [["widget", "anchorNotes", "getNote"], { input: {} }];
    const unrelatedQueryKey = [["user", "me"], { input: {} }];

    queryClient.setQueryData(crashedWidgetQueryKey, "stale");
    queryClient.setQueryData(unrelatedQueryKey, "unrelated");

    removeWidgetDataQueries(queryClient, [[["widget", "anchorNotes"]]]);

    expect(queryClient.getQueryData(crashedWidgetQueryKey)).toBeUndefined();
    expect(queryClient.getQueryData(unrelatedQueryKey)).toBe("unrelated");
  });
});
