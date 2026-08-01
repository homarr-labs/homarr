import { describe, expect, it } from "vitest";

import { getPreferredUnit, getVisibleForecastDays } from "./component";

describe("weather formatting", () => {
  it("preserves valid zero temperatures", () => {
    expect(getPreferredUnit(0)).toBe("0.0°C");
    expect(getPreferredUnit(0, true, true)).toBe("32°F");
  });

  it("limits compact forecasts by both axes", () => {
    expect(getVisibleForecastDays(7, 120, 100, false)).toBe(2);
    expect(getVisibleForecastDays(7, 600, 100, false)).toBe(3);
    expect(getVisibleForecastDays(7, 120, 100, true)).toBe(7);
  });
});
