import { setTimeout } from "node:timers/promises";

import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { createWeatherUrl, parseWeatherAsync } from "./weather-public";
import type { Weather } from "./weather-public";

import { createWidgetRequestHandler } from "./lib/widget-request-handler";

const requestWeatherAsync = async (
  input: { latitude: number; longitude: number },
  signal: AbortSignal,
): Promise<Weather> => {
  const url = createWeatherUrl(input);
  let res = await fetchWithTrustedCertificatesAsync(url.toString(), { signal });
  if (res.status === 503) {
    await res.body?.cancel().catch(() => undefined);
    // Retry one transient upstream outage while the server is already fetching
    // for the board, before hydration starts a separate browser request.
    await setTimeout(150, undefined, { signal });
    res = await fetchWithTrustedCertificatesAsync(url.toString(), { signal });
  }
  if (!res.ok) throw new ResponseError(res);

  const json: unknown = await res.json();
  return parseWeatherAsync(json);
};

export const weatherRequestHandler = createWidgetRequestHandler({
  // Coordinates are a public, continuous key space. Keep this cache process-local and bounded.
  cacheTtlMs: 5 * 60 * 1000,
  requestTimeoutMs: 10_000,
  requestAsync: requestWeatherAsync,
});

export type { Weather } from "./weather-public";
