import { z } from "zod";

import { createAirQualityUrl, parseAirQualityAsync } from "@homarr/request-handler/air-quality-public";
import { createWeatherUrl, parseWeatherAsync } from "@homarr/request-handler/weather-public";

const coordinates = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

/** A narrow public-data adapter, only after the worker authorizes the original query. */
export async function requestBrowserWeatherAsync(path: string, input: unknown, signal: AbortSignal) {
  if (path !== "widget.weather.atLocation" && path !== "widget.airQuality.atLocation") return null;
  const point = coordinates.parse(input);
  let url = createWeatherUrl(point);
  let parse: (json: unknown) => Promise<unknown> = parseWeatherAsync;
  if (path === "widget.airQuality.atLocation") {
    url = createAirQualityUrl(point);
    parse = parseAirQualityAsync;
  }
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    credentials: "omit",
    redirect: "error",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}.`);
  return parse(await response.json());
}
