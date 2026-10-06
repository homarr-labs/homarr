import { describe, expect, test } from "vitest";
import { definition as appDefinition } from "./app";
import { definition as beszelAlertsDefinition } from "./beszel-alerts";
import { definition as beszelSystemGridDefinition } from "./beszel-system-grid";
import { definition as beszelSystemStatsDefinition } from "./beszel-system-stats";
import { definition as beszelSystemTableDefinition } from "./beszel-system-table";
import { definition as clockDefinition } from "./clock";
import { definition as customApiDefinition } from "./custom-api";
import { getWidgetQueryKeys, supportsAdvancedFocus } from "./definition";
import { definition as dockerDefinition } from "./docker";
import { definition as downloadsDefinition } from "./downloads";
import { definition as indexerManagerDefinition } from "./indexer-manager";
import { definition as notebookDefinition } from "./notebook";

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
});

describe("supportsAdvancedFocus", () => {
  test.each([
    appDefinition,
    beszelAlertsDefinition,
    beszelSystemGridDefinition,
    beszelSystemStatsDefinition,
    beszelSystemTableDefinition,
    customApiDefinition,
    indexerManagerDefinition,
    notebookDefinition,
  ])("keeps non-enhanced widgets compact", (widgetDefinition) => {
    expect(supportsAdvancedFocus(widgetDefinition)).toBe(false);
  });

  test("requires an explicit opt-in", () => {
    expect(supportsAdvancedFocus({})).toBe(false);
    expect(supportsAdvancedFocus(clockDefinition)).toBe(true);
    expect(supportsAdvancedFocus(dockerDefinition)).toBe(true);
    expect(supportsAdvancedFocus(downloadsDefinition)).toBe(true);
  });
});
