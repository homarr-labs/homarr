import { z } from "zod/v4";

import { fetchWithTimeout } from "@homarr/common";

import { createTRPCRouter, publicProcedure } from "../trpc";

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
      .transform(() => ({ results: [] })), // We fallback to empty array if no results
  );

export const locationRouter = createTRPCRouter({
  searchCity: publicProcedure
    .input(locationSearchCityInput)
    .output(locationSearchCityOutput)
    .query(async ({ input }) => {
      const res = await fetchWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?name=${input.query}`);
      return (await res.json()) as z.infer<typeof locationSearchCityOutput>;
    }),
});
