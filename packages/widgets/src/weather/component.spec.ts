import { describe, expect, it } from "vitest";

import { reduceWidgetOptionsWithDefinition } from "../manifest";
import { definition } from ".";
import { getPreferredTime, getPreferredUnit, getPreferredWindSpeed } from "./format";
import { formatWeatherDate } from "./icon";
import { getAdvancedWeatherLayout, getCompactWeatherLayout } from "./layout";

describe("weather formatting", () => {
  it("preserves valid zero values", () => {
    expect(getPreferredUnit(0)).toBe("0.0°C");
    expect(getPreferredUnit(0, true, true)).toBe("32°F");
    expect(getPreferredWindSpeed(0)).toBe("0.0");
  });

  it("keeps missing and invalid values truthful", () => {
    expect(getPreferredUnit(null)).toBe("?");
    expect(getPreferredWindSpeed(undefined)).toBe("?");
    expect(getPreferredTime(undefined, "en-US")).toBe("?");
    expect(getPreferredTime("invalid", "en-US")).toBe("?");
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

describe("weather layout", () => {
  it("keeps micro widgets focused on current temperature", () => {
    expect(getCompactWeatherLayout(120, 100, true, 7)).toEqual({
      tier: "micro",
      forecastDays: 0,
      showCity: false,
      showCondition: false,
      showHighLow: false,
      showSecondary: false,
    });
  });

  it("caps compact forecasts by size and saved preference", () => {
    expect(getCompactWeatherLayout(200, 200, true, 7).forecastDays).toBe(2);
    expect(getCompactWeatherLayout(424, 200, true, 3).forecastDays).toBe(3);
    expect(getCompactWeatherLayout(640, 360, true, 7).forecastDays).toBe(7);
    expect(getCompactWeatherLayout(640, 360, false, 7).forecastDays).toBe(0);
  });

  it("adapts the advanced view to mobile and desktop surfaces", () => {
    expect(getAdvancedWeatherLayout(374, 624)).toMatchObject({
      dailyColumns: 2,
      hourlyTickStep: 6,
      showChartAxes: false,
    });
    expect(getAdvancedWeatherLayout(800, 560)).toMatchObject({
      chartHeight: 200,
      dailyColumns: 4,
      hourlyTickStep: 3,
      showChartAxes: true,
    });
  });
});

describe("weather defaults", () => {
  it("starts minimal and static while preserving saved false values", () => {
    const options = definition.createOptions();
    expect(options.showCity.defaultValue).toBe(false);
    expect(options.hasForecast.defaultValue).toBe(false);
    expect(options.forecastDayCount.defaultValue).toBe(3);
    expect(options.animateIcons.defaultValue).toBe(false);
    expect(options.showHumidity.defaultValue).toBe(false);

    const reduced = reduceWidgetOptionsWithDefinition(definition, {} as never, {
      showCity: false,
      hasForecast: false,
      showHumidity: false,
      isFormatFahrenheit: true,
    });
    expect(reduced).toMatchObject({
      showCity: false,
      hasForecast: false,
      showHumidity: false,
      isFormatFahrenheit: true,
    });
  });
});
