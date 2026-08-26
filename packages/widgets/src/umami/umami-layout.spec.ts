import { describe, expect, test } from "vitest";

import { getUmamiLayout } from "./umami-layout";

describe("Umami layout", () => {
  test.each([
    { width: 260, height: 119, property: "isDense" as const, expected: true },
    { width: 260, height: 120, property: "isDense" as const, expected: false },
    { width: 100, height: 80, property: "showXAxis" as const, expected: true },
    { width: 100, height: 80, property: "showSecondaryStats" as const, expected: true },
    { width: 100, height: 80, property: "showDetailedStats" as const, expected: true },
  ])("sets $property to $expected at $width x $height", ({ width, height, property, expected }) => {
    expect(getUmamiLayout({ width, height, displayMode: "compact" })[property]).toBe(expected);
  });

  test("keeps advanced details visible and changes columns at 900px", () => {
    expect(getUmamiLayout({ width: 899, height: 80, displayMode: "advanced" })).toEqual({
      isDense: false,
      showXAxis: true,
      showSecondaryStats: true,
      showDetailedStats: true,
      stackAdvancedContent: true,
    });
    expect(getUmamiLayout({ width: 900, height: 80, displayMode: "advanced" }).stackAdvancedContent).toBe(false);
  });
});
