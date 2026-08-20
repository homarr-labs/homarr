import { Response } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { weatherRequestHandler } from "./weather";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const makeWeatherResponse = () => {
  const hours = Array.from({ length: 25 }, (_, index) => `2026-07-01T${String(index % 24).padStart(2, "0")}:00`);
  const days = [
    "2026-06-30",
    ...Array.from({ length: 7 }, (_, index) => `2026-07-${String(index + 1).padStart(2, "0")}`),
  ];
  const hourlyValues = hours.map<number | null>((_, index) => index);
  const dailyValues = days.map<number | null>((_, index) => index);
  const sunrise = days.map<string | null>((day) => `${day}T05:00`);

  return {
    timezone: "Europe/Berlin",
    utc_offset_seconds: 7200,
    current: {
      time: "2026-07-01T12:00",
      temperature_2m: 24,
      relative_humidity_2m: 55,
      apparent_temperature: 25,
      is_day: 1,
      precipitation: 0,
      weather_code: 1,
      wind_speed_10m: 12,
      wind_gusts_10m: 20,
    },
    hourly: {
      time: hours,
      temperature_2m: hourlyValues,
      apparent_temperature: hourlyValues,
      precipitation_probability: hourlyValues,
      precipitation: hourlyValues,
      weather_code: hourlyValues,
      relative_humidity_2m: hourlyValues,
      wind_speed_10m: hourlyValues,
      wind_gusts_10m: hourlyValues,
    },
    daily: {
      time: days,
      weather_code: dailyValues,
      temperature_2m_max: dailyValues,
      temperature_2m_min: dailyValues,
      apparent_temperature_max: dailyValues,
      apparent_temperature_min: dailyValues,
      precipitation_probability_max: dailyValues,
      precipitation_sum: dailyValues,
      relative_humidity_2m_mean: dailyValues,
      wind_speed_10m_max: dailyValues,
      wind_gusts_10m_max: dailyValues,
      uv_index_max: dailyValues,
      sunrise,
      sunset: days.map((day) => `${day}T21:00`),
      daylight_duration: dailyValues,
    },
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  weatherRequestHandler.invalidateCache();
});

describe("weather request handler", () => {
  it("requests bounded useful forecasts and normalizes location times", async () => {
    const response = makeWeatherResponse();
    response.hourly.temperature_2m = [null];
    Reflect.deleteProperty(response.hourly, "wind_gusts_10m");
    response.daily.sunrise[1] = null;
    mockFetch.mockResolvedValue(new Response(JSON.stringify(response)));

    const first = await weatherRequestHandler.handler({ latitude: 48.85, longitude: 2.35 }).getDataAsync();
    const second = await weatherRequestHandler.handler({ latitude: 48.85, longitude: 2.35 }).getDataAsync();

    expect(first.data.current.observedAt).toBe("2026-07-01T10:00:00.000Z");
    expect(first.data.hourly).toHaveLength(24);
    expect(first.data.daily).toHaveLength(7);
    expect(first.data.daily[0]?.date).toBe("2026-07-01");
    expect(first.data.hourly[0]?.temperature).toBeNull();
    expect(first.data.hourly[1]?.temperature).toBeNull();
    expect(first.data.hourly[0]?.windGusts).toBeNull();
    expect(first.data.daily[0]?.sunriseAt).toBeNull();
    expect(first.data.daily[1]?.sunriseAt).toBe("2026-07-02T03:00:00.000Z");
    expect(second.data).toStrictEqual(first.data);
    expect(mockFetch).toHaveBeenCalledOnce();

    const requestUrl = new URL(String(mockFetch.mock.calls[0]?.[0]));
    expect(requestUrl.searchParams.get("forecast_hours")).toBe("24");
    expect(requestUrl.searchParams.get("forecast_days")).toBe("7");
    expect(requestUrl.searchParams.has("past_days")).toBe(false);
    expect(requestUrl.searchParams.get("timezone")).toBe("auto");
    expect(requestUrl.searchParams.get("current")).toContain("apparent_temperature");
    expect(requestUrl.searchParams.get("hourly")).toContain("precipitation_probability");
    expect(requestUrl.searchParams.get("daily")).toContain("uv_index_max");
  });

  it("rejects unsuccessful Open-Meteo responses", async () => {
    mockFetch.mockResolvedValue(new Response("unavailable", { status: 503 }));

    await expect(weatherRequestHandler.handler({ latitude: 48.85, longitude: 2.35 }).getDataAsync()).rejects.toThrow();
  });
});
