import { z } from "zod";

import type { StatsProvider } from "../types";

const plantitStatsResponseSchema = z
  .object({
    diaryEntryCount: z.number().finite().int().nonnegative(),
    plantCount: z.number().finite().int().nonnegative(),
    imageCount: z.number().finite().int().nonnegative(),
    botanicalInfoCount: z.number().finite().int().nonnegative(),
  })
  .passthrough();

const plantitLoginResponseSchema = z.object({
  jwt: z.object({ value: z.string().min(1) }),
});

export const plantitStatsProvider = {
  metrics: [
    { key: "plants", label: "Plants", unit: "count" },
    { key: "species", label: "Species", unit: "count" },
    { key: "photos", label: "Photos", unit: "count" },
    { key: "events", label: "Events", unit: "count" },
  ],

  async fetchAsync(context) {
    const login = plantitLoginResponseSchema.parse(
      await context.requestAsync("/api/authentication/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: context.secret("username"),
          password: context.secret("password"),
        }),
        signal: context.signal,
      }),
    );
    const response = await context.requestAsync("/api/stats", {
      headers: { Authorization: `Bearer ${login.jwt.value}` },
      signal: context.signal,
    });
    const stats = plantitStatsResponseSchema.parse(response);

    return {
      plants: stats.plantCount,
      species: stats.botanicalInfoCount,
      photos: stats.imageCount,
      events: stats.diaryEntryCount,
    };
  },
} satisfies StatsProvider;
