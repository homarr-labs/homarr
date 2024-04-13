import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const locationRouter = createTRPCRouter({
  searchCity: publicProcedure
    .input(validation.location.searchCity.input)
    .output(validation.location.searchCity.output)
    .query(async ({ input }) => {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${input.query}`,
      );
      return (await res.json()) as z.infer<
        typeof validation.location.searchCity.output
      >;
    }),
});
