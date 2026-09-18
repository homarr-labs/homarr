import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().nonnegative();
const viewsResponseSchema = z
  .object({
    Audio: countSchema,
    Movie: countSchema,
    Series: countSchema,
    Other: countSchema,
  })
  .passthrough();

export const jellystatStatsProvider = {
  metrics: [
    { key: "songs", label: "Song plays (30 days)", unit: "count" },
    { key: "movies", label: "Movie plays (30 days)", unit: "count" },
    { key: "episodes", label: "Episode plays (30 days)", unit: "count" },
    { key: "other", label: "Other plays (30 days)", unit: "count" },
  ],
  async fetchAsync(context) {
    const params = new URLSearchParams({ days: "30" });
    const response = await context.requestAsync(`/stats/getViewsByLibraryType?${params.toString()}`, {
      headers: { "X-API-Token": context.secret("apiKey") },
      signal: context.signal,
    });
    const views = viewsResponseSchema.parse(response);

    return {
      songs: views.Audio,
      movies: views.Movie,
      episodes: views.Series,
      other: views.Other,
    };
  },
} satisfies StatsProvider;
