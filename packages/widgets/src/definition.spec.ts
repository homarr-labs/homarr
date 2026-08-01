import { describe, expect, test } from "vitest";

import { getWidgetQueryKeys } from "./definition";

describe("getWidgetQueryKeys", () => {
  test("falls back to the widget router namespace", () => {
    expect(getWidgetQueryKeys({ kind: "example" })).toEqual([[["widget", "example"]]]);
  });

  test("wraps a singular explicit key", () => {
    expect(getWidgetQueryKeys({ kind: "example", queryKey: [["app", "byId"]] })).toEqual([[["app", "byId"]]]);
  });

  test("preserves every explicit key for multi-root widgets", () => {
    const queryKeys = [[["widget", "audioStats"]], [["widget", "mediaServer"]]] as const;

    expect(getWidgetQueryKeys({ kind: "audioStats", queryKeys })).toBe(queryKeys);
  });
});
