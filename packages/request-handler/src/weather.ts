import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { z } from "zod";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { withTimeoutAsync } from "@homarr/core/infrastructure/http/timeout";

import { createWidgetRequestHandler } from "./lib/widget-request-handler";

dayjs.extend(utc);
dayjs.extend(timezone);

const HOURLY_FORECAST_LENGTH = 24;
const DAILY_FORECAST_LENGTH = 7;

const requestWeatherAsync = async (input: { latitude: number; longitude: number }): Promise<Weather> => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", input.latitude.toString());
  url.searchParams.set("longitude", input.longitude.toString());
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(","),
  );
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "apparent_temperature",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "apparent_temperature_max",
      "apparent_temperature_min",
      "precipitation_probability_max",
      "precipitation_sum",
      "relative_humidity_2m_mean",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "uv_index_max",
      "sunrise",
      "sunset",
      "daylight_duration",
    ].join(","),
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_hours", HOURLY_FORECAST_LENGTH.toString());
  url.searchParams.set("forecast_days", DAILY_FORECAST_LENGTH.toString());

  const res = await withTimeoutAsync(async (signal) => {
    return await fetchWithTrustedCertificatesAsync(url.toString(), { signal });
  });
  if (!res.ok) throw new ResponseError(res);

  const json: unknown = await res.json();
  const weather = await atLocationOutput.parseAsync(json);
  const currentLocalDate = weather.current.time.slice(0, 10);
  const matchedCurrentDayIndex = weather.daily.time.indexOf(currentLocalDate);
  const currentDayIndex = matchedCurrentDayIndex < 0 ? 0 : matchedCurrentDayIndex;
  const dailyIndexes = weather.daily.time
    .map((_, index) => index)
    .slice(currentDayIndex, currentDayIndex + DAILY_FORECAST_LENGTH);
  return {
    timezone: weather.timezone,
    utcOffsetSeconds: weather.utc_offset_seconds,
    current: {
      observedAt: toUtcInstant(weather.current.time, weather.timezone),
      temperature: weather.current.temperature_2m,
      apparentTemperature: weather.current.apparent_temperature,
      relativeHumidity: weather.current.relative_humidity_2m,
      precipitation: weather.current.precipitation,
      weatherCode: weather.current.weather_code,
      weathercode: weather.current.weather_code,
      windSpeed: weather.current.wind_speed_10m,
      windspeed: weather.current.wind_speed_10m,
      windGusts: weather.current.wind_gusts_10m,
      isDay: weather.current.is_day === 1,
    },
    hourly: weather.hourly.time.slice(0, HOURLY_FORECAST_LENGTH).map((value, index) => {
      return {
        observedAt: toUtcInstant(value, weather.timezone),
        temperature: weather.hourly.temperature_2m[index] ?? null,
        apparentTemperature: weather.hourly.apparent_temperature[index] ?? null,
        precipitationProbability: weather.hourly.precipitation_probability[index] ?? null,
        precipitation: weather.hourly.precipitation[index] ?? null,
        weatherCode: weather.hourly.weather_code[index] ?? null,
        relativeHumidity: weather.hourly.relative_humidity_2m[index] ?? null,
        windSpeed: weather.hourly.wind_speed_10m[index] ?? null,
        windGusts: weather.hourly.wind_gusts_10m[index] ?? null,
      };
    }),
    daily: dailyIndexes.map((index) => {
      const value = weather.daily.time[index] ?? currentLocalDate;
      return {
        date: value,
        time: value,
        weatherCode: weather.daily.weather_code[index] ?? 404,
        maxTemperature: weather.daily.temperature_2m_max[index] ?? null,
        maxTemp: weather.daily.temperature_2m_max[index] ?? undefined,
        minTemperature: weather.daily.temperature_2m_min[index] ?? null,
        minTemp: weather.daily.temperature_2m_min[index] ?? undefined,
        maxApparentTemperature: weather.daily.apparent_temperature_max[index] ?? null,
        minApparentTemperature: weather.daily.apparent_temperature_min[index] ?? null,
        precipitationProbability: weather.daily.precipitation_probability_max[index] ?? null,
        precipitation: weather.daily.precipitation_sum[index] ?? null,
        averageHumidity: weather.daily.relative_humidity_2m_mean[index] ?? null,
        humidity: weather.daily.relative_humidity_2m_mean[index] ?? undefined,
        maxWindSpeed: weather.daily.wind_speed_10m_max[index] ?? null,
        maxWindGusts: weather.daily.wind_gusts_10m_max[index] ?? null,
        uvIndex: weather.daily.uv_index_max[index] ?? null,
        sunriseAt: toOptionalUtcInstant(weather.daily.sunrise[index], weather.timezone),
        sunrise: weather.daily.sunrise[index] ?? undefined,
        sunsetAt: toOptionalUtcInstant(weather.daily.sunset[index], weather.timezone),
        sunset: weather.daily.sunset[index] ?? undefined,
        daylightDuration: weather.daily.daylight_duration[index] ?? null,
      };
    }),
  } satisfies Weather;
};

export const weatherRequestHandler = createWidgetRequestHandler({
  cacheTtlMs: 5 * 60 * 1000,
  requestAsync: requestWeatherAsync,
});

const nullableNumberArray = z.array(z.number().nullable()).default([]);
const nullableStringArray = z.array(z.string().nullable()).default([]);

const atLocationOutput = z.object({
  timezone: z.string().min(1),
  utc_offset_seconds: z.number(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    apparent_temperature: z.number(),
    is_day: z.number(),
    precipitation: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    wind_gusts_10m: z.number(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: nullableNumberArray,
    apparent_temperature: nullableNumberArray,
    precipitation_probability: nullableNumberArray,
    precipitation: nullableNumberArray,
    weather_code: nullableNumberArray,
    relative_humidity_2m: nullableNumberArray,
    wind_speed_10m: nullableNumberArray,
    wind_gusts_10m: nullableNumberArray,
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: nullableNumberArray,
    temperature_2m_max: nullableNumberArray,
    temperature_2m_min: nullableNumberArray,
    apparent_temperature_max: nullableNumberArray,
    apparent_temperature_min: nullableNumberArray,
    precipitation_probability_max: nullableNumberArray,
    precipitation_sum: nullableNumberArray,
    relative_humidity_2m_mean: nullableNumberArray,
    wind_speed_10m_max: nullableNumberArray,
    wind_gusts_10m_max: nullableNumberArray,
    uv_index_max: nullableNumberArray,
    sunrise: nullableStringArray,
    sunset: nullableStringArray,
    daylight_duration: nullableNumberArray,
  }),
});

const toUtcInstant = (value: string, timeZone: string): string => {
  const parsed = dayjs.tz(value, timeZone);
  if (!parsed.isValid()) throw new Error(`Invalid weather timestamp: ${value}`);
  return parsed.utc().toISOString();
};

const toOptionalUtcInstant = (value: string | null | undefined, timeZone: string): string | null => {
  if (!value) return null;
  return toUtcInstant(value, timeZone);
};

export interface Weather {
  timezone: string;
  utcOffsetSeconds: number;
  current: {
    temperature: number;
    apparentTemperature: number;
    relativeHumidity: number;
    precipitation: number;
    weatherCode: number;
    weathercode: number;
    windSpeed: number;
    windspeed: number;
    windGusts: number;
    isDay: boolean;
    observedAt: string;
  };
  hourly: {
    observedAt: string;
    temperature: number | null;
    apparentTemperature: number | null;
    precipitationProbability: number | null;
    precipitation: number | null;
    weatherCode: number | null;
    relativeHumidity: number | null;
    windSpeed: number | null;
    windGusts: number | null;
  }[];
  daily: {
    date: string;
    time: string;
    weatherCode: number;
    maxTemperature: number | null;
    maxTemp: number | undefined;
    minTemperature: number | null;
    minTemp: number | undefined;
    maxApparentTemperature: number | null;
    minApparentTemperature: number | null;
    precipitationProbability: number | null;
    precipitation: number | null;
    averageHumidity: number | null;
    humidity: number | undefined;
    maxWindSpeed: number | null;
    maxWindGusts: number | null;
    uvIndex: number | null;
    sunriseAt: string | null;
    sunrise: string | undefined;
    sunsetAt: string | null;
    sunset: string | undefined;
    daylightDuration: number | null;
  }[];
}
