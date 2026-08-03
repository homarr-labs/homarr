import { describe, expect, it } from "vitest";

import { getPreferredTime, getPreferredUnit, getPreferredWindSpeed, getVisibleForecastDays } from "./component";
import { formatWeatherDate } from "./icon";

describe("weather formatting", () => {
  it("preserves valid zero temperatures", () => {
    expect(getPreferredUnit(0)).toBe("0.0°C");
    expect(getPreferredUnit(0, true, true)).toBe("32°F");
  });

  it("keeps zero wind speeds and missing forecast values truthful", () => {
    expect(getPreferredWindSpeed(0)).toBe("0.0");
    expect(getPreferredWindSpeed(undefined)).toBe("?");
    expect(getPreferredTime(undefined, "en-US")).toBe("?");
    expect(getPreferredTime("invalid", "en-US")).toBe("?");
  });

  it("limits compact forecasts by both axes", () => {
    expect(getVisibleForecastDays(7, 120, 100)).toBe(2);
    expect(getVisibleForecastDays(7, 600, 100)).toBe(3);
  });

  it.each([
    ["dddd, MMMM D", "Monday, August 3"],
    ["dddd, D MMMM", "Monday, 3 August"],
    ["MMM D", "Aug 3"],
    ["D MMM", "3 Aug"],
    ["DD/MM/YYYY", "03/08/2026"],
    ["MM/DD/YYYY", "08/03/2026"],
    ["DD/MM", "03/08"],
    ["MM/DD", "08/03"],
  ] as const)("honors the saved %s date format", (pattern, expected) => {
    expect(formatWeatherDate("2026-08-03", "en-US", pattern)).toBe(expected);
  });
});
