import { z } from "zod";

import { fetchStatsGroupsAsync } from "../types";
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
    const apiKey = encodeURIComponent(context.secret("apiKey"));
    return await fetchStatsGroupsAsync([
      {
        metrics: ["approvedPushes", "rejectedPushes"],
        fetchAsync: async () => {
          const response = await context.requestAsync(`/api/release/stats?apikey=${apiKey}`, {
            signal: context.signal,
          });
          const stats = statsSchema.parse(response);
          return { approvedPushes: stats.push_approved_count, rejectedPushes: stats.push_rejected_count };
        },
      },
      {
        metrics: ["filters"],
        fetchAsync: async () => ({
          filters: listSchema.parse(
            await context.requestAsync(`/api/filters?apikey=${apiKey}`, { signal: context.signal }),
          ).length,
        }),
      },
      {
        metrics: ["indexers"],
        fetchAsync: async () => ({
          indexers: listSchema.parse(
            await context.requestAsync(`/api/release/indexers?apikey=${apiKey}`, { signal: context.signal }),
          ).length,
        }),
      },
    ]);
  },
} satisfies StatsProvider;
