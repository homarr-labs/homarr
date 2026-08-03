import { describe, expect, test } from "vitest";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";

import { definition as appDefinition } from "./app";
import { definition as beszelSystemGridDefinition } from "./beszel-system-grid";
import { definition as beszelSystemTableDefinition } from "./beszel-system-table";
import {
  getWidgetQueryKeys,
  getWidgetRuntimeQueries,
  setWidgetRuntimeQueries,
  supportsAdvancedFocus,
} from "./definition";

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
    const input = { integrationIds: [], month: 7, year: 2026, releaseType: [], showUnmonitored: false };
    const queryKey = getQueryKey(clientApi.widget.calendar.findAllEvents, input, "query");

    setWidgetRuntimeQueries(widgetStateRef, [queryKey]);

    expect(widgetStateRef.current.togglePolling).toBe(togglePolling);
    expect(getWidgetRuntimeQueries(widgetStateRef)).toEqual([{ path: ["widget", "calendar", "findAllEvents"], input }]);
  });
});

describe("supportsAdvancedFocus", () => {
  const definition = { supportsAdvancedFocus: undefined } as Parameters<typeof supportsAdvancedFocus>[0];

  test("defaults to enabled", () => {
    expect(supportsAdvancedFocus(definition)).toBe(true);
  });

  test("allows widgets to opt out", () => {
    expect(supportsAdvancedFocus({ ...definition, supportsAdvancedFocus: false })).toBe(false);
  });

  test.each([appDefinition, beszelSystemGridDefinition, beszelSystemTableDefinition])(
    "keeps non-enhanced widgets compact",
    (widgetDefinition) => {
      expect(supportsAdvancedFocus(widgetDefinition)).toBe(false);
    },
  );
});
