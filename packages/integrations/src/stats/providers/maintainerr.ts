import { z } from "zod";

import type { StatsProvider } from "../types";

const nonNegativeFiniteNumber = z.number().finite().nonnegative();
const handledCount = nonNegativeFiniteNumber.int();

const storageMetricsSchema = z.object({
  cleanupTotals: z.object({
    itemsHandled: handledCount,
    episodesHandled: handledCount,
    moviesHandled: handledCount,
  }),
  collectionSummary: z.object({
    activeSizeBytes: nonNegativeFiniteNumber,
  }),
});

export const maintainerrStatsProvider = {
  getHttpAuthentication: () => ({ headers: {} }),
  metrics: [
    { key: "itemsHandled", label: "Items handled", unit: "count" },
    { key: "episodesHandled", label: "Episodes handled", unit: "count" },
    { key: "moviesHandled", label: "Movies handled", unit: "count" },
    { key: "reclaimable", label: "Reclaimable storage", unit: "bytes" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/storage-metrics", { signal: context.signal });
    const metrics = storageMetricsSchema.parse(response);

    return {
      itemsHandled: metrics.cleanupTotals.itemsHandled,
      episodesHandled: metrics.cleanupTotals.episodesHandled,
      moviesHandled: metrics.cleanupTotals.moviesHandled,
      reclaimable: metrics.collectionSummary.activeSizeBytes,
    };
  },
} satisfies StatsProvider;
