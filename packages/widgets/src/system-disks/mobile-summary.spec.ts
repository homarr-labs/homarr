import { describe, expect, test } from "vitest";

import { formatDiskTemperature } from "./mobile-summary";

describe("formatDiskTemperature", () => {
  test("preserves a valid zero-degree reading", () => {
    expect(formatDiskTemperature(0, true)).toBe("0°C");
  });

  test("omits unavailable or disabled readings", () => {
    expect(formatDiskTemperature(null, true)).toBeUndefined();
    expect(formatDiskTemperature(undefined, true)).toBeUndefined();
    expect(formatDiskTemperature(20, false)).toBeUndefined();
  });
});
