import { describe, expect, test } from "vitest";
import { definition as appDefinition } from "./app";
import { definition as customApiDefinition } from "./custom-api";
import { getWidgetQueryKeys, supportsAdvancedFocus } from "./definition";
import { definition as dockerDefinition } from "./docker";
import { definition as downloadsDefinition } from "./downloads";

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
  test.each([appDefinition, dockerDefinition, customApiDefinition])(
    "keeps non-enhanced widgets compact",
    (widgetDefinition) => {
      expect(supportsAdvancedFocus(widgetDefinition)).toBe(false);
    },
  );

  test("requires an explicit opt-in", () => {
    expect(supportsAdvancedFocus({})).toBe(false);
    expect(supportsAdvancedFocus(downloadsDefinition)).toBe(true);
  });
});
