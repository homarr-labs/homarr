import { describe, expect, test } from "vitest";

import { getGridCols, getIconSize } from "./component";

describe("Bazarr responsive layout", () => {
  test("uses two columns for a short widget so all stats remain visible", () => {
    expect(getGridCols(220, 100, 4)).toBe(2);
  });

  test("uses four columns in a wide advanced surface", () => {
    expect(getGridCols(800, 400, 4, true)).toBe(4);
  });

  test("sizes icons from the constrained dimension", () => {
    expect(getIconSize(180)).toBe(16);
    expect(getIconSize(340)).toBe(22);
  });
});
