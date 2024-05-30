import { validation } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const weatherRouter = createTRPCRouter({
  atLocation: publicProcedure.input(validation.widget.weather.atLocationInput).query(async ({ input }) => {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`,
    );
    const json: unknown = await res.json();
    const weather = await validation.widget.weather.atLocationOutput.parseAsync(json);
    return {
      current: weather.current_weather,
      daily: weather.daily.time.map((value, index) => {
        return {
          time: value,
          weatherCode: weather.daily.weathercode[index],
          maxTemp: weather.daily.temperature_2m_max[index],
          minTemp: weather.daily.temperature_2m_min[index],
        };
      }),
    };
  }),
});
