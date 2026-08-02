import { describe, expect, it } from "vitest";

import { getPreferredTime, getPreferredUnit, getPreferredWindSpeed, getVisibleForecastDays } from "./component";

describe("weather formatting", () => {
  it("preserves valid zero temperatures", () => {
    expect(getPreferredUnit(0)).toBe("0.0°C");
    expect(getPreferredUnit(0, true, true)).toBe("32°F");
  });

  it("keeps zero wind speeds and missing forecast values truthful", () => {
    expect(getPreferredWindSpeed(0)).toBe("0.0");
    expect(getPreferredWindSpeed(undefined)).toBe("?");
    expect(getPreferredTime(undefined)).toBe("?");
    expect(getPreferredTime("invalid")).toBe("?");
  });

  it("limits compact forecasts by both axes", () => {
    expect(getVisibleForecastDays(7, 120, 100)).toBe(2);
    expect(getVisibleForecastDays(7, 600, 100)).toBe(3);
  });
});
