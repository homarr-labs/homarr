import { describe, expect, test } from "vitest";

import {
  dashboardSupportingQueryPolicies,
  isWidgetDataQueryKey,
  queryCacheDefaultRefetchIntervalMs,
  queryCacheDefaultStaleTimeMs,
  queryCacheMetadataStaleTimeMs,
} from "@homarr/api/query-cache";

describe("isWidgetDataQueryKey", () => {
  test.each([
    [[["widget", "calendar", "findAllEvents"], { type: "query" }], true],
    [[["app", "byId"], { type: "query" }], true],
    [[["app", "byIds"], { type: "query" }], true],
    [[["docker", "getContainers"], { type: "query" }], true],
    [[["integration", "byIds"], { type: "query" }], true],
    [[["widget", "app", "ping"], { type: "query", input: { id: "abc" } }], false],
    [[["widget", "beszel", "getSystemStats"], { type: "query" }], false],
    [[["widget", "beszel", "getSystems"], { type: "query" }], true],
    [[["app", "selectable"], { type: "query" }], false],
    [[["board", "getBoardByName"], { type: "query" }], false],
    [["widget"], false],
  ])("matches widget data queries for %j", (queryKey, expected) => {
    expect(isWidgetDataQueryKey(queryKey)).toBe(expected);
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
