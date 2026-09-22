import { z } from "zod";

import { fetchStatsGroupsAsync } from "../types";
import type { StatsAuthenticationContext, StatsProvider } from "../types";

const countSchema = z.number().finite().nonnegative().int();
const collectionStatsSchema = z.object({ doc_count: countSchema }).passthrough();
const downloadStatsSchema = z
  .object({ pending: countSchema.nullable().transform((value) => value ?? 0) })
  .passthrough();

const getHttpAuthentication = (context: StatsAuthenticationContext) => ({
  headers: { Authorization: `Token ${context.secret("apiKey")}` },
});

export const tubearchivistStatsProvider = {
  getHttpAuthentication,
  metrics: [
    { key: "pendingDownloads", label: "Pending downloads", unit: "count" },
    { key: "videos", label: "Videos", unit: "count" },
    { key: "channels", label: "Channels", unit: "count" },
    { key: "playlists", label: "Playlists", unit: "count" },
  ],
  async fetchAsync(context) {
    const headers = getHttpAuthentication(context).headers;
    const collection = (path: `/${string}`, key: string) => ({
      metrics: [key],
      fetchAsync: async () => ({
        [key]: collectionStatsSchema.parse(await context.requestAsync(path, { headers, signal: context.signal }))
          .doc_count,
      }),
    });
    return await fetchStatsGroupsAsync([
      {
        metrics: ["pendingDownloads"],
        fetchAsync: async () => ({
          pendingDownloads: downloadStatsSchema.parse(
            await context.requestAsync("/api/stats/download/", { headers, signal: context.signal }),
          ).pending,
        }),
      },
      collection("/api/stats/video/", "videos"),
      collection("/api/stats/channel/", "channels"),
      collection("/api/stats/playlist/", "playlists"),
    ]);
  },
} satisfies StatsProvider;
