import { z } from "zod";

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
    const [downloadsResponse, videosResponse, channelsResponse, playlistsResponse] = await Promise.all([
      context.requestAsync("/api/stats/download/", { headers, signal: context.signal }),
      context.requestAsync("/api/stats/video/", { headers, signal: context.signal }),
      context.requestAsync("/api/stats/channel/", { headers, signal: context.signal }),
      context.requestAsync("/api/stats/playlist/", { headers, signal: context.signal }),
    ]);

    return {
      pendingDownloads: downloadStatsSchema.parse(downloadsResponse).pending ?? 0,
      videos: collectionStatsSchema.parse(videosResponse).doc_count,
      channels: collectionStatsSchema.parse(channelsResponse).doc_count,
      playlists: collectionStatsSchema.parse(playlistsResponse).doc_count,
    };
  },
} satisfies StatsProvider;
