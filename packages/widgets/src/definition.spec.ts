import { describe, expect, test } from "vitest";

import { getWidgetQueryKeys, getWidgetRuntimeQueries, setWidgetRuntimeQueries } from "./definition";

const togglePolling = () => undefined;

describe("getWidgetQueryKeys", () => {
  test("falls back to the widget router namespace", () => {
    expect(getWidgetQueryKeys({ kind: "example" })).toEqual([[["widget", "example"]]]);
  });

  test("wraps a singular explicit key", () => {
    expect(getWidgetQueryKeys({ kind: "example", queryKey: [["app", "byId"]] })).toEqual([[["app", "byId"]]]);
  });

  test("preserves every explicit key for multi-root widgets", () => {
    const queryKeys = [
      [["widget", "audioStats", "getStats"]],
      [["widget", "mediaServer", "getCurrentStreams"]],
    ] as const;

    expect(getWidgetQueryKeys({ kind: "audioStats", queryKeys })).toBe(queryKeys);
  });

  test("registers runtime queries without replacing imperative widget actions", () => {
    const widgetStateRef = { current: { togglePolling } };
    const runtimeQueries = [{ path: ["widget", "calendar", "findAllEvents"], input: { month: 7 } }];

    setWidgetRuntimeQueries(widgetStateRef, runtimeQueries);

    expect(widgetStateRef.current.togglePolling).toBe(togglePolling);
    expect(getWidgetRuntimeQueries(widgetStateRef)).toEqual(runtimeQueries);
  });
});
