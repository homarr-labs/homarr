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

const FORECAST_DAYS = 7;

const requestedVariables = [
  "european_aqi",
  "us_aqi",
  "uv_index",
  "pm10",
  "pm2_5",
  "carbon_monoxide",
  "nitrogen_dioxide",
  "sulphur_dioxide",
  "ozone",
  "european_aqi_pm2_5",
  "european_aqi_pm10",
  "european_aqi_nitrogen_dioxide",
  "european_aqi_ozone",
  "european_aqi_sulphur_dioxide",
  "us_aqi_pm2_5",
  "us_aqi_pm10",
  "us_aqi_nitrogen_dioxide",
  "us_aqi_carbon_monoxide",
  "us_aqi_ozone",
  "us_aqi_sulphur_dioxide",
  "alder_pollen",
  "birch_pollen",
  "grass_pollen",
  "mugwort_pollen",
  "olive_pollen",
  "ragweed_pollen",
] as const;

export const airQualityRequestHandler = createWidgetRequestHandler({
  cacheTtlMs: 15 * 60 * 1000,
  fallbackToStaleOnError: true,
  staleIfErrorTtlMs: 24 * 60 * 60 * 1000,
  async requestAsync(input: { latitude: number; longitude: number }) {
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.searchParams.set("latitude", input.latitude.toString());
    url.searchParams.set("longitude", input.longitude.toString());
    url.searchParams.set("current", requestedVariables.join(","));
    url.searchParams.set("hourly", requestedVariables.join(","));
    url.searchParams.set("forecast_days", FORECAST_DAYS.toString());
    url.searchParams.set("timezone", "auto");

    const response = await withTimeoutAsync(async (signal) => {
      return await fetchWithTrustedCertificatesAsync(url.toString(), { signal });
    });
    if (!response.ok) throw new ResponseError(response);

    const json: unknown = await response.json();
    const airQuality = await atLocationOutput.parseAsync(json);
    const hourly = airQuality.hourly.time.map((value, index) => {
      return normalizePoint(airQuality.hourly, index, toUtcInstant(value, airQuality.timezone));
    });

    return {
      timezone: airQuality.timezone,
      utcOffsetSeconds: airQuality.utc_offset_seconds,
      current: normalizePoint(
        airQuality.current,
        undefined,
        toUtcInstant(airQuality.current.time, airQuality.timezone),
      ),
      hourly,
      daily: getDailyMaximums(airQuality.hourly),
    } satisfies AirQuality;
  },
});

const nullableNumber = z.number().nullable();
const nullableNumberArray = z.array(nullableNumber);

const currentValues = z.object({
  time: z.string(),
  european_aqi: nullableNumber,
  us_aqi: nullableNumber,
  uv_index: nullableNumber,
  pm10: nullableNumber,
  pm2_5: nullableNumber,
  carbon_monoxide: nullableNumber,
  nitrogen_dioxide: nullableNumber,
  sulphur_dioxide: nullableNumber,
  ozone: nullableNumber,
  european_aqi_pm2_5: nullableNumber,
  european_aqi_pm10: nullableNumber,
  european_aqi_nitrogen_dioxide: nullableNumber,
  european_aqi_ozone: nullableNumber,
  european_aqi_sulphur_dioxide: nullableNumber,
  us_aqi_pm2_5: nullableNumber,
  us_aqi_pm10: nullableNumber,
  us_aqi_nitrogen_dioxide: nullableNumber,
  us_aqi_carbon_monoxide: nullableNumber,
  us_aqi_ozone: nullableNumber,
  us_aqi_sulphur_dioxide: nullableNumber,
  alder_pollen: nullableNumber,
  birch_pollen: nullableNumber,
  grass_pollen: nullableNumber,
  mugwort_pollen: nullableNumber,
  olive_pollen: nullableNumber,
  ragweed_pollen: nullableNumber,
});

const hourlyValues = z.object({
  time: z.array(z.string()),
  european_aqi: nullableNumberArray,
  us_aqi: nullableNumberArray,
  uv_index: nullableNumberArray,
  pm10: nullableNumberArray,
  pm2_5: nullableNumberArray,
  carbon_monoxide: nullableNumberArray,
  nitrogen_dioxide: nullableNumberArray,
  sulphur_dioxide: nullableNumberArray,
  ozone: nullableNumberArray,
  european_aqi_pm2_5: nullableNumberArray,
  european_aqi_pm10: nullableNumberArray,
  european_aqi_nitrogen_dioxide: nullableNumberArray,
  european_aqi_ozone: nullableNumberArray,
  european_aqi_sulphur_dioxide: nullableNumberArray,
  us_aqi_pm2_5: nullableNumberArray,
  us_aqi_pm10: nullableNumberArray,
  us_aqi_nitrogen_dioxide: nullableNumberArray,
  us_aqi_carbon_monoxide: nullableNumberArray,
  us_aqi_ozone: nullableNumberArray,
  us_aqi_sulphur_dioxide: nullableNumberArray,
  alder_pollen: nullableNumberArray,
  birch_pollen: nullableNumberArray,
  grass_pollen: nullableNumberArray,
  mugwort_pollen: nullableNumberArray,
  olive_pollen: nullableNumberArray,
  ragweed_pollen: nullableNumberArray,
});

const atLocationOutput = z.object({
  timezone: z.string().min(1),
  utc_offset_seconds: z.number(),
  current: currentValues,
  hourly: hourlyValues,
});

type CurrentValues = z.infer<typeof currentValues>;
type HourlyValues = z.infer<typeof hourlyValues>;

const getValue = (values: CurrentValues | HourlyValues, field: keyof Omit<CurrentValues, "time">, index?: number) => {
  const value = values[field];
  if (Array.isArray(value)) return value[index ?? 0] ?? null;
  return value;
};

const normalizePoint = (
  values: CurrentValues | HourlyValues,
  index: number | undefined,
  observedAt: string,
): AirQualityPoint => ({
  observedAt,
  europeanAqi: getValue(values, "european_aqi", index),
  usAqi: getValue(values, "us_aqi", index),
  uvIndex: getValue(values, "uv_index", index),
  pollutants: {
    pm2_5: getValue(values, "pm2_5", index),
    pm10: getValue(values, "pm10", index),
    ozone: getValue(values, "ozone", index),
    nitrogenDioxide: getValue(values, "nitrogen_dioxide", index),
    sulphurDioxide: getValue(values, "sulphur_dioxide", index),
    carbonMonoxide: getValue(values, "carbon_monoxide", index),
  },
  europeanSubIndices: {
    pm2_5: getValue(values, "european_aqi_pm2_5", index),
    pm10: getValue(values, "european_aqi_pm10", index),
    ozone: getValue(values, "european_aqi_ozone", index),
    nitrogenDioxide: getValue(values, "european_aqi_nitrogen_dioxide", index),
    sulphurDioxide: getValue(values, "european_aqi_sulphur_dioxide", index),
    carbonMonoxide: null,
  },
  usSubIndices: {
    pm2_5: getValue(values, "us_aqi_pm2_5", index),
    pm10: getValue(values, "us_aqi_pm10", index),
    ozone: getValue(values, "us_aqi_ozone", index),
    nitrogenDioxide: getValue(values, "us_aqi_nitrogen_dioxide", index),
    sulphurDioxide: getValue(values, "us_aqi_sulphur_dioxide", index),
    carbonMonoxide: getValue(values, "us_aqi_carbon_monoxide", index),
  },
  pollen: {
    alder: getValue(values, "alder_pollen", index),
    birch: getValue(values, "birch_pollen", index),
    grass: getValue(values, "grass_pollen", index),
    mugwort: getValue(values, "mugwort_pollen", index),
    olive: getValue(values, "olive_pollen", index),
    ragweed: getValue(values, "ragweed_pollen", index),
  },
});

const getDailyMaximums = (hourly: HourlyValues): AirQuality["daily"] => {
  const grouped = new Map<string, AirQuality["daily"][number]>();

  hourly.time.forEach((time, index) => {
    const date = time.slice(0, 10);
    const existing = grouped.get(date) ?? {
      date,
      europeanAqiMax: null,
      usAqiMax: null,
      uvIndexMax: null,
      pm2_5Max: null,
      pm10Max: null,
    };

    existing.europeanAqiMax = maxNullable(existing.europeanAqiMax, hourly.european_aqi[index]);
    existing.usAqiMax = maxNullable(existing.usAqiMax, hourly.us_aqi[index]);
    existing.uvIndexMax = maxNullable(existing.uvIndexMax, hourly.uv_index[index]);
    existing.pm2_5Max = maxNullable(existing.pm2_5Max, hourly.pm2_5[index]);
    existing.pm10Max = maxNullable(existing.pm10Max, hourly.pm10[index]);
    grouped.set(date, existing);
  });

  return Array.from(grouped.values()).slice(0, FORECAST_DAYS);
};

const maxNullable = (current: number | null, candidate: number | null | undefined): number | null => {
  if (candidate === null || candidate === undefined) return current;
  if (current === null) return candidate;
  return Math.max(current, candidate);
};

const toUtcInstant = (value: string, timeZone: string): string => {
  const parsed = dayjs.tz(value, timeZone);
  if (!parsed.isValid()) throw new Error(`Invalid air quality timestamp: ${value}`);
  return parsed.utc().toISOString();
};

export interface AirQualityPollutants {
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogenDioxide: number | null;
  sulphurDioxide: number | null;
  carbonMonoxide: number | null;
}

export interface AirQualityPoint {
  observedAt: string;
  europeanAqi: number | null;
  usAqi: number | null;
  uvIndex: number | null;
  pollutants: AirQualityPollutants;
  europeanSubIndices: AirQualityPollutants;
  usSubIndices: AirQualityPollutants;
  pollen: {
    alder: number | null;
    birch: number | null;
    grass: number | null;
    mugwort: number | null;
    olive: number | null;
    ragweed: number | null;
  };
}

export interface AirQuality {
  timezone: string;
  utcOffsetSeconds: number;
  current: AirQualityPoint;
  hourly: AirQualityPoint[];
  daily: {
    date: string;
    europeanAqiMax: number | null;
    usAqiMax: number | null;
    uvIndexMax: number | null;
    pm2_5Max: number | null;
    pm10Max: number | null;
  }[];
}
