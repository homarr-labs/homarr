import { z } from "zod";

const citySchema = z.object({
  id: z.number(),
  name: z.string(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  population: z.number().optional(),
});

const searchCityInput = z.object({
  query: z.string(),
});

const searchCityOutput = z
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

export const locationSchemas = {
  searchCity: {
    input: searchCityInput,
    output: searchCityOutput,
  },
};
