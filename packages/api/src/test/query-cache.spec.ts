import { afterEach, describe, expect, test, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import {
  dashboardSupportingQueryPolicies,
  isWidgetDataQueryKey,
  isWidgetDataTrpcPath,
  queryCacheDefaultRefetchIntervalMs,
  queryCacheDefaultStaleTimeMs,
  queryCacheMetadataStaleTimeMs,
} from "@homarr/api/query-cache";

afterEach(() => {
  vi.useRealTimers();
});

describe("isWidgetDataQueryKey", () => {
  test.each([
    [[["widget", "calendar", "findAllEvents"], { type: "query" }], true],
    [[["app", "byId"], { type: "query" }], true],
    [[["app", "byIds"], { type: "query" }], true],
    [[["docker", "getContainers"], { type: "query" }], true],
    [[["integration", "byIds"], { type: "query" }], true],
    [[["widget", "app", "ping"], { type: "query", input: { id: "abc" } }], false],
    [[["widget", "beszel", "getSystemStats"], { type: "query" }], true],
    [[["widget", "beszel", "getSystems"], { type: "query" }], true],
    [[["app", "selectable"], { type: "query" }], false],
    [[["board", "getBoardByName"], { type: "query" }], false],
    [["widget"], false],
  ])("matches widget data queries for %j", (queryKey, expected) => {
    expect(isWidgetDataQueryKey(queryKey)).toBe(expected);
  });
});

describe("isWidgetDataTrpcPath", () => {
  test.each([
    ["widget.calendar.findAllEvents", true],
    ["app.byIds", true],
    ["integration.byIds", true],
    ["docker.getContainers", true],
    ["widget.app.ping", false],
    ["widget.beszel.getSystemStats", true],
    ["board.getBoardByName", false],
  ])("classifies dashboard data path %s", (path, expected) => {
    expect(isWidgetDataTrpcPath(path)).toBe(expected);
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

describe("dashboard supporting query policies", () => {
  test("bounds metadata staleness without adding per-widget timers", () => {
    expect(dashboardSupportingQueryPolicies).toEqual([
      {
        queryKey: [["app", "byId"]],
        refetchInterval: false,
        staleTime: queryCacheMetadataStaleTimeMs,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      {
        queryKey: [["app", "byIds"]],
        refetchInterval: false,
        staleTime: queryCacheMetadataStaleTimeMs,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      {
        queryKey: [["integration", "byIds"]],
        refetchInterval: false,
        staleTime: queryCacheMetadataStaleTimeMs,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      {
        queryKey: [["docker", "getContainers"]],
        refetchInterval: queryCacheDefaultRefetchIntervalMs,
        staleTime: queryCacheDefaultStaleTimeMs,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    ]);
  });
});
