import { describe, expect, test } from "vitest";

import { hasExceededLongPressMoveTolerance } from "./long-press";

describe("hasExceededLongPressMoveTolerance", () => {
  test("allows small touch jitter", () => {
    expect(hasExceededLongPressMoveTolerance({ x: 100, y: 100 }, { x: 106, y: 106 })).toBe(false);
  });

  test("allows movement exactly at the threshold", () => {
    expect(hasExceededLongPressMoveTolerance({ x: 100, y: 100 }, { x: 106, y: 108 })).toBe(false);
  });

  test("cancels a deliberate scroll gesture", () => {
    expect(hasExceededLongPressMoveTolerance({ x: 100, y: 100 }, { x: 100, y: 116 })).toBe(true);
  });
});
