import { z } from "zod";

import { fetchStatsGroupsAsync } from "../types";
import type { StatsProvider } from "../types";

const finiteNumberSchema = z.number().finite().nonnegative();

const countResponseSchema = z.array(
  z
    .object({
      count: finiteNumberSchema,
    })
    .passthrough(),
);

const artistsResponseSchema = z.array(
  z
    .object({
      artists: z.array(z.unknown()),
    })
    .passthrough(),
);

const allTimeStart = "2006-04-23T00:00:00.000Z";

const endpointPath = (endpoint: string, token: string) => {
  const params = new URLSearchParams({
    start: allTimeStart,
    timeSplit: "all",
    token,
  });
  return `/spotify/${endpoint}?${params.toString()}` as `/${string}`;
};

export const yourSpotifyStatsProvider = {
  metrics: [
    { key: "songs", label: "Songs listened", unit: "count" },
    { key: "time", label: "Listening time", unit: "seconds" },
    { key: "artists", label: "Artists listened", unit: "count" },
  ],
  async fetchAsync(context) {
    const token = context.secret("apiKey");
    return await fetchStatsGroupsAsync([
      {
        metrics: ["songs"],
        fetchAsync: async () => ({
          songs:
            countResponseSchema.parse(
              await context.requestAsync(endpointPath("songs_per", token), { signal: context.signal }),
            )[0]?.count ?? 0,
        }),
      },
      {
        metrics: ["time"],
        fetchAsync: async () => ({
          time:
            (countResponseSchema.parse(
              await context.requestAsync(endpointPath("time_per", token), { signal: context.signal }),
            )[0]?.count ?? 0) / 1000,
        }),
      },
      {
        metrics: ["artists"],
        fetchAsync: async () => ({
          artists:
            artistsResponseSchema.parse(
              await context.requestAsync(endpointPath("different_artists_per", token), { signal: context.signal }),
            )[0]?.artists.length ?? 0,
        }),
      },
    ]);
  },
} satisfies StatsProvider;
