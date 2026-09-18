import { z } from "zod";

import type { StatsProvider } from "../types";

const watchSchema = z
  .object({
    last_changed: z.number().finite(),
    viewed: z.boolean(),
  })
  .passthrough();

const watchesSchema = z.record(z.string(), watchSchema);

export const changedetectionStatsProvider = {
  metrics: [
    { key: "diffsDetected", label: "Diffs detected", unit: "count" },
    { key: "totalObserved", label: "Total observed", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/v1/watch", {
      headers: { "x-api-key": context.secret("apiKey") },
      signal: context.signal,
    });
    const watches = watchesSchema.parse(response);

    return {
      diffsDetected: Object.values(watches).filter((watch) => watch.last_changed > 0 && !watch.viewed).length,
      totalObserved: Object.keys(watches).length,
    };
  },
} satisfies StatsProvider;
