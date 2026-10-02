import { z } from "zod";

import type { StatsProvider } from "../types";

const count = z.number().finite().int().nonnegative();
const statsSchema = z.object({ push_approved_count: count, push_rejected_count: count }).passthrough();
const listSchema = z.array(z.unknown());

export const autobrrStatsProvider = {
  metrics: [
    { key: "approvedPushes", label: "Approved pushes", unit: "count" },
    { key: "rejectedPushes", label: "Rejected pushes", unit: "count" },
    { key: "filters", label: "Filters", unit: "count" },
    { key: "indexers", label: "Indexers", unit: "count" },
  ],
  async fetchAsync(context) {
    const [stats, filters, indexers] = await Promise.all([
      context.requestAsync("/api/release/stats", { signal: context.signal }),
      context.requestAsync("/api/filters", { signal: context.signal }),
      context.requestAsync("/api/release/indexers", { signal: context.signal }),
    ]);
    const parsedStats = statsSchema.parse(stats);
    return {
      approvedPushes: parsedStats.push_approved_count,
      rejectedPushes: parsedStats.push_rejected_count,
      filters: listSchema.parse(filters).length,
      indexers: listSchema.parse(indexers).length,
    };
  },
} satisfies StatsProvider;
