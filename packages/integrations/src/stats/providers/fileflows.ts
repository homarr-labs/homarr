import { z } from "zod";

import type { StatsProvider } from "../types";

const fileflowsStatusSchema = z.object({
  queue: z.number().finite().int().nonnegative(),
  processing: z.number().finite().int().nonnegative(),
  processed: z.number().finite().int().nonnegative(),
  time: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
});

export const fileflowsStatsProvider = {
  metrics: [
    { key: "queue", label: "Queued", unit: "count" },
    { key: "processing", label: "Processing", unit: "count" },
    { key: "processed", label: "Processed", unit: "count" },
    { key: "time", label: "Processing time", unit: "text" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/status", { signal: context.signal });
    return fileflowsStatusSchema.parse(response);
  },
} satisfies StatsProvider;
