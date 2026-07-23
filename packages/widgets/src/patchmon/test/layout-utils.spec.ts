import { describe, expect, test } from "vitest";

import { getGridCols, shouldShowComplianceHeroText } from "../layout-utils";

describe("getGridCols", () => {
  test("returns 1 column for narrow widths", () => {
    expect(getGridCols(128)).toBe(1);
    expect(getGridCols(219)).toBe(1);
  });

  test("returns 2 columns at 220px breakpoint", () => {
    expect(getGridCols(220)).toBe(2);
    expect(getGridCols(256)).toBe(2);
  });

  test("returns 3 columns at 380px breakpoint", () => {
    expect(getGridCols(380)).toBe(3);
  });

  test("returns 4 columns at 500px breakpoint", () => {
    expect(getGridCols(500)).toBe(4);
  });
});

describe("shouldShowComplianceHeroText", () => {
  test("returns false for 1-column-wide layouts", () => {
    expect(shouldShowComplianceHeroText(128)).toBe(false);
    expect(shouldShowComplianceHeroText(219)).toBe(false);
  });

  test("returns true for 2+-column-wide layouts", () => {
    expect(shouldShowComplianceHeroText(220)).toBe(true);
    expect(shouldShowComplianceHeroText(256)).toBe(true);
    expect(shouldShowComplianceHeroText(384)).toBe(true);
  });
});
