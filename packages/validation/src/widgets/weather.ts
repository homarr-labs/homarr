import { z } from "zod";

export const atLocationInput = z.object({
  longitude: z.number(),
  latitude: z.number(),
});

export const atLocationOutput = z.object({
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

export const weatherWidgetSchemas = {
  atLocationInput,
  atLocationOutput,
};
