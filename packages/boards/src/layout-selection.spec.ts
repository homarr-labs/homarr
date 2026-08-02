import { describe, expect, test } from "vitest";

import { getLayoutIdForViewportWidth } from "./layout-selection";

const layouts = [
  { id: "mobile", breakpoint: 0 },
  { id: "tablet", breakpoint: 768 },
  { id: "desktop", breakpoint: 1280 },
];

describe("getLayoutIdForViewportWidth", () => {
  test.each([
    [390, "mobile"],
    [768, "tablet"],
    [1279, "tablet"],
    [1920, "desktop"],
  ])("selects the responsive layout for %ipx", (width, expected) => {
    expect(getLayoutIdForViewportWidth(layouts, width)).toBe(expected);
  });

  test("falls back to the smallest layout for invalid widths", () => {
    expect(getLayoutIdForViewportWidth(layouts, Number.NaN)).toBe("mobile");
  });

  test("rejects boards without layouts", () => {
    expect(() => getLayoutIdForViewportWidth([], 1280)).toThrow("Expected the board to contain a layout");
  });
});
