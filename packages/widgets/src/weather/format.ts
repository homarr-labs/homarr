import type { RouterOutputs } from "@homarr/api";
import { formatDuration, metricToImperial } from "@homarr/common";

import { formatLocalizedDate, formatLocalizedTime } from "../common/locale";

export type WeatherData = NonNullable<RouterOutputs["widget"]["weather"]["atLocation"]>;
export type DailyWeatherData = WeatherData["daily"][number];

export const toPreferredTemperature = (value: number | null | undefined, isFahrenheit = false): number | null => {
  if (value === null || value === undefined) return null;
  if (isFahrenheit) return value * (9 / 5) + 32;
  return value;
};

export const getPreferredUnit = (
  value: number | null | undefined,
  isFahrenheit = false,
  disableTemperatureDecimals = false,
): string => {
  const preferred = toPreferredTemperature(value, isFahrenheit);
  if (preferred === null) return "?";
  return `${preferred.toFixed(disableTemperatureDecimals ? 0 : 1)}°${isFahrenheit ? "F" : "C"}`;
};

export const getPreferredWindSpeed = (value: number | null | undefined, useImperialSpeed = false): string => {
  if (value === null || value === undefined) return "?";
  return (useImperialSpeed ? metricToImperial(value) : value).toFixed(1);
};

export const getPreferredTime = (value: string | null | undefined, locale = "en-US", timeZone?: string): string => {
  if (!value) return "?";
  return formatLocalizedTime(value, locale, { timeZone });
};

export const getPreferredDate = (value: string, locale: string, options: Intl.DateTimeFormatOptions): string =>
  formatLocalizedDate(value, locale, options);

export const getPreferredDaylightDuration = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "?";
  return formatDuration(value * 1000);
};

export interface HourlyChartRow {
  observedAt: string;
  temperature: number | null;
  apparentTemperature: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  relativeHumidity: number | null;
  windSpeed: number | null;
  windGusts: number | null;
}

export const getHourlyChartData = (weather: WeatherData, isFahrenheit: boolean): HourlyChartRow[] =>
  weather.hourly.map((hour) => ({
    ...hour,
    temperature: toPreferredTemperature(hour.temperature, isFahrenheit),
    apparentTemperature: toPreferredTemperature(hour.apparentTemperature, isFahrenheit),
  }));
