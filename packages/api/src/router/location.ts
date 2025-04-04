import type { z } from "zod";

import { fetchWithTimeout } from "@homarr/common";
import { locationSearchCityInput, locationSearchCityOutput } from "@homarr/validation/location";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const locationRouter = createTRPCRouter({
  searchCity: publicProcedure
    .input(locationSearchCityInput)
    .output(locationSearchCityOutput)
    .query(async ({ input }) => {
      const res = await fetchWithTimeout(`https://geocoding-api.open-meteo.com/v1/search?name=${input.query}`);
      return (await res.json()) as z.infer<typeof locationSearchCityOutput>;
    }),
});
