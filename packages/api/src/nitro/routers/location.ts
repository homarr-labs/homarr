import { z } from "zod/v4";

import { sourceProcedure } from "../procedure";
import { fetchLocationResponseAsync } from "./-locations/helpers";
import type { LocationProcedureResources } from "./-locations/resources";

export type { LocationProcedureResources } from "./-locations/resources";

const citySchema = z.object({
  id: z.number(),
  name: z.string(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  population: z.number().optional(),
});

export const locationSearchCityInput = z.object({
  query: z.string(),
});

export const locationSearchCityOutput = z
  .object({
    results: z.array(citySchema),
  })
  .or(
    z
      .object({
        generationtime_ms: z.number(),
      })
      .refine((data) => Object.keys(data).length === 1, { message: "Invalid response" })
      .transform(() => ({ results: [] })),
  );

export function createLocationProcedures(resources: LocationProcedureResources) {
  return {
    searchCity: sourceProcedure({
      path: "location.searchCity",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    })
      .input(locationSearchCityInput)
      .output(z.unknown().pipe(locationSearchCityOutput))
      .handler(async ({ context, input, signal }) => {
        if (resources.noExternalConnection) return { results: [] };

        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.searchParams.set("name", input.query);
        const response = await fetchLocationResponseAsync(resources, context, url.toString(), signal);
        return await response.json();
      }),
  };
}
