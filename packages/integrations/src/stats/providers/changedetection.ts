import { z } from "zod";

import type { StatsAuthenticationContext, StatsProvider } from "../types";

const watchSchema = z
  .object({
    last_changed: z.number().finite(),
    viewed: z.boolean(),
  })
  .passthrough();

const watchesSchema = z.record(z.string(), watchSchema);

const getHttpAuthentication = (context: StatsAuthenticationContext) => ({
  headers: { "x-api-key": context.secret("apiKey") },
});

export const changedetectionStatsProvider = {
  getHttpAuthentication,
  metrics: [
    { key: "diffsDetected", label: "Diffs detected", unit: "count" },
    { key: "totalObserved", label: "Total observed", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/v1/watch", {
      headers: getHttpAuthentication(context).headers,
      signal: context.signal,
    });
    const watches = watchesSchema.parse(response);

    return {
      diffsDetected: Object.values(watches).filter((watch) => watch.last_changed > 0 && !watch.viewed).length,
      totalObserved: Object.keys(watches).length,
    };
  },
} satisfies StatsProvider;
