import { describe, expect, test } from "vitest";

import { getPreferredUnit } from "./temperature";

describe("getPreferredUnit", () => {
  test("preserves zero in Celsius and Fahrenheit", () => {
    expect(getPreferredUnit(0)).toBe("0.0°C");
    expect(getPreferredUnit(0, true)).toBe("32.0°F");
  });

  test("only uses the unavailable placeholder for missing values", () => {
    expect(getPreferredUnit(undefined)).toBe("?");
  });

  test("respects the decimal preference", () => {
    expect(getPreferredUnit(0, false, true)).toBe("0°C");
    expect(getPreferredUnit(0, true, true)).toBe("32°F");
    expect(getPreferredUnit(12.6, false, true)).toBe("13°C");
  });
});
