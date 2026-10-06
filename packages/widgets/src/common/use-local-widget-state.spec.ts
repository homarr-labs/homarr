import { describe, expect, it } from "vitest";

import { parseLocalWidgetState, serializeLocalWidgetState } from "./use-local-widget-state";

const isCounterState = (value: unknown): value is { count: number } =>
  typeof value === "object" && value !== null && "count" in value && typeof value.count === "number";

describe("local widget state serialization", () => {
  it("round trips validated state", () => {
    const serialized = serializeLocalWidgetState(1, { count: 3 });
    expect(parseLocalWidgetState(serialized, 1, isCounterState)).toEqual({ count: 3 });
  });

  it("rejects malformed and invalid state", () => {
    expect(parseLocalWidgetState("not-json", 1, isCounterState)).toBeUndefined();
    expect(parseLocalWidgetState('{"version":1,"value":{"count":"3"}}', 1, isCounterState)).toBeUndefined();
  });

  it("uses the supplied migration for old versions", () => {
    const serialized = serializeLocalWidgetState(1, { oldCount: 4 });
    expect(
      parseLocalWidgetState(serialized, 2, isCounterState, (value) => {
        if (typeof value !== "object" || value === null || !("oldCount" in value)) return undefined;
        return { count: Number(value.oldCount) };
      }),
    ).toEqual({ count: 4 });
  });
});
