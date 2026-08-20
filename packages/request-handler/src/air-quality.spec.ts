import { Response } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { airQualityRequestHandler } from "./air-quality";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const makeAirQualityResponse = () => {
  const times = ["2026-07-01T00:00", "2026-07-01T01:00", "2026-07-02T00:00"];
  const values = [10, 20, 30];
  const fields = [
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

  return {
    timezone: "Europe/Berlin",
    utc_offset_seconds: 7200,
    current: {
      time: "2026-07-01T12:00",
      ...Object.fromEntries(fields.map((field) => [field, field === "ragweed_pollen" ? null : 12])),
    },
    hourly: {
      time: times,
      ...Object.fromEntries(fields.map((field) => [field, field === "ragweed_pollen" ? [null, null, null] : values])),
    },
    fields,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  airQualityRequestHandler.invalidateCache();
});

describe("air quality request handler", () => {
  it("requests and normalizes the full useful forecast field set", async () => {
    const fixture = makeAirQualityResponse();
    mockFetch.mockResolvedValue(new Response(JSON.stringify(fixture)));

    const first = await airQualityRequestHandler.handler({ latitude: 48.85, longitude: 2.35 }).getDataAsync();
    const second = await airQualityRequestHandler.handler({ latitude: 48.85, longitude: 2.35 }).getDataAsync();

    expect(first.data.current.observedAt).toBe("2026-07-01T10:00:00.000Z");
    expect(first.data.current.pollutants.pm2_5).toBe(12);
    expect(first.data.current.pollen.ragweed).toBeNull();
    expect(first.data.hourly[0]?.observedAt).toBe("2026-06-30T22:00:00.000Z");
    expect(first.data.daily).toEqual([
      { date: "2026-07-01", europeanAqiMax: 20, usAqiMax: 20, uvIndexMax: 20, pm2_5Max: 20, pm10Max: 20 },
      { date: "2026-07-02", europeanAqiMax: 30, usAqiMax: 30, uvIndexMax: 30, pm2_5Max: 30, pm10Max: 30 },
    ]);
    expect(second.data).toStrictEqual(first.data);
    expect(mockFetch).toHaveBeenCalledOnce();

    const requestUrl = new URL(String(mockFetch.mock.calls[0]?.[0]));
    expect(requestUrl.origin).toBe("https://air-quality-api.open-meteo.com");
    expect(requestUrl.searchParams.get("forecast_days")).toBe("7");
    expect(requestUrl.searchParams.get("timezone")).toBe("auto");
    expect(requestUrl.searchParams.get("current")).toContain("european_aqi_pm2_5");
    expect(requestUrl.searchParams.get("hourly")).toContain("us_aqi_carbon_monoxide");
    expect(requestUrl.searchParams.get("hourly")).toContain("ragweed_pollen");
  });

  it("rejects unsuccessful Open-Meteo responses", async () => {
    mockFetch.mockResolvedValue(new Response("unavailable", { status: 503 }));

    await expect(
      airQualityRequestHandler.handler({ latitude: 48.85, longitude: 2.35 }).getDataAsync(),
    ).rejects.toThrow();
  });
});
