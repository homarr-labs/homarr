import { z } from "zod";

import type { StatsProvider } from "../types";

const triliumStatsResponseSchema = z
  .object({
    version: z.object({ app: z.string().min(1) }).passthrough(),
    database: z.object({ activeNotes: z.number().finite().int().nonnegative() }).passthrough(),
    statistics: z.object({ databaseSizeBytes: z.number().finite().nonnegative() }).passthrough(),
  })
  .passthrough();

export const triliumStatsProvider = {
  metrics: [
    { key: "version", label: "Version", unit: "text" },
    { key: "notesCount", label: "Notes", unit: "count" },
    { key: "dbSize", label: "Database size", unit: "bytes" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/etapi/metrics?format=json", {
      headers: { Authorization: context.secret("apiKey") },
      signal: context.signal,
    });
    const stats = triliumStatsResponseSchema.parse(response);

    return {
      version: stats.version.app,
      notesCount: stats.database.activeNotes,
      dbSize: stats.statistics.databaseSizeBytes,
    };
  },
} satisfies StatsProvider;
