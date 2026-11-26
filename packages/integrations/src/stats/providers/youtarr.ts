import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();

const summarySchema = z
  .object({
    version: z.string(),
    ytDlp: z.object({ version: z.string().nullable() }).passthrough(),
    library: z.object({ channels: countSchema, videos: countSchema, storageBytes: countSchema }).passthrough(),
    // Null until Youtarr has finished a download run.
    lastRun: z.object({ downloaded: countSchema, failed: countSchema }).passthrough().nullable(),
  })
  .passthrough();

export const youtarrStatsProvider = {
  metrics: [
    { key: "channels", label: "Channels", unit: "count" },
    { key: "videos", label: "Videos", unit: "count" },
    { key: "storageUsed", label: "Storage used", unit: "bytes" },
    { key: "lastRunDownloaded", label: "Downloaded in last run", unit: "count" },
    { key: "lastRunFailed", label: "Failed in last run", unit: "count" },
    { key: "version", label: "Version", unit: "text" },
    { key: "ytDlpVersion", label: "yt-dlp version", unit: "text" },
  ],
  async fetchAsync(context) {
    const summary = summarySchema.parse(await context.requestAsync("/api/status/summary", { signal: context.signal }));

    return {
      channels: summary.library.channels,
      videos: summary.library.videos,
      storageUsed: summary.library.storageBytes,
      lastRunDownloaded: summary.lastRun?.downloaded ?? null,
      lastRunFailed: summary.lastRun?.failed ?? null,
      version: summary.version,
      ytDlpVersion: summary.ytDlp.version,
    };
  },
} satisfies StatsProvider;
