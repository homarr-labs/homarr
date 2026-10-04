import { z } from "zod";

import type { StatsFetchContext, StatsProvider } from "../types";

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

  getHttpAuthenticationAsync,

  async fetchAsync(context) {
    const authentication = await getHttpAuthenticationAsync(context);
    const response = await context.requestAsync("/api/stats", {
      headers: authentication.headers,
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

async function getHttpAuthenticationAsync(context: StatsFetchContext) {
  try {
    const loginResponse = await context.requestAsync("/api/authentication/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: context.secret("username"),
        password: context.secret("password"),
      }),
      signal: context.signal,
    });
    const login = plantitLoginResponseSchema.safeParse(loginResponse);
    if (!login.success) throw new Error("Plant-it authentication failed");
    const token = login.data.jwt.value;
    return { headers: { Authorization: `Bearer ${token}` }, redactValues: [token] };
  } catch {
    throw new Error("Plant-it authentication failed");
  }
}
