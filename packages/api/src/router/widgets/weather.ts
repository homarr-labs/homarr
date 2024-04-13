import { validation } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const weatherRouter = createTRPCRouter({
  atLocation: publicProcedure
    .input(validation.widget.weather.atLocationInput)
    .output(validation.widget.weather.atLocationOutput)
    .query(async ({ input }) => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`,
      );
      return res.json();
    }),
});
