import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { createAirQualityUrl, parseAirQualityAsync } from "./air-quality-public";
import { createWidgetRequestHandler } from "./lib/widget-request-handler";

export const airQualityRequestHandler = createWidgetRequestHandler({
  // Coordinates are a public, continuous key space. Keep this cache process-local and bounded.
  cacheTtlMs: 15 * 60 * 1000,
  fallbackToStaleOnError: true,
  staleIfErrorTtlMs: 24 * 60 * 60 * 1000,
  requestTimeoutMs: 10_000,
  async requestAsync(input: { latitude: number; longitude: number }, signal: AbortSignal) {
    const url = createAirQualityUrl(input);
    const response = await fetchWithTrustedCertificatesAsync(url.toString(), { signal });
    if (!response.ok) throw new ResponseError(response);

    const json: unknown = await response.json();
    return parseAirQualityAsync(json);
  },
});

export type { AirQuality, AirQualityPoint, AirQualityPollutants } from "./air-quality-public";
