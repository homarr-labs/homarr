import { z } from "zod";

import { fetchWithTimeout } from "@homarr/common";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const atLocationInput = z.object({
  longitude: z.number(),
  latitude: z.number(),
});

const atLocationOutput = z.object({
  current_weather: z.object({
    weathercode: z.number(),
    temperature: z.number(),
    windspeed: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weathercode: z.array(z.number()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    sunrise: z.array(z.string()),
    sunset: z.array(z.string()),
    wind_speed_10m_max: z.array(z.number()),
    wind_gusts_10m_max: z.array(z.number()),
  }),
});

export const weatherRouter = createTRPCRouter({
  atLocation: publicProcedure.input(atLocationInput).query(async ({ input }) => {
    const res = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${input.latitude}&longitude=${input.longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,wind_speed_10m_max,wind_gusts_10m_max&current_weather=true&timezone=auto`,
    );
    const json: unknown = await res.json();
    const weather = await atLocationOutput.parseAsync(json);
    return {
      current: weather.current_weather,
      daily: weather.daily.time.map((value, index) => {
        return {
          time: value,
          weatherCode: weather.daily.weathercode[index] ?? 404,
          maxTemp: weather.daily.temperature_2m_max[index],
          minTemp: weather.daily.temperature_2m_min[index],
          sunrise: weather.daily.sunrise[index],
          sunset: weather.daily.sunset[index],
          maxWindSpeed: weather.daily.wind_speed_10m_max[index],
          maxWindGusts: weather.daily.wind_gusts_10m_max[index],
        };
      }),
    };
  }),
});
