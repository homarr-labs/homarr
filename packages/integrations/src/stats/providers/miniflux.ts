import { z } from "zod";

import type { StatsAuthenticationContext, StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();

const minifluxCountersSchema = z.object({
  reads: z.record(z.string(), countSchema),
  unreads: z.record(z.string(), countSchema),
});

const sumValues = (values: Record<string, number>) => Object.values(values).reduce((total, value) => total + value, 0);

const getHttpAuthentication = (context: StatsAuthenticationContext) => ({
  headers: { "X-Auth-Token": context.secret("apiKey") },
});

export const minifluxStatsProvider = {
  getHttpAuthentication,
  metrics: [
    { key: "read", label: "Read", unit: "count" },
    { key: "unread", label: "Unread", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/v1/feeds/counters", {
      headers: getHttpAuthentication(context).headers,
      signal: context.signal,
    });
    const counters = minifluxCountersSchema.parse(response);

    return {
      read: sumValues(counters.reads),
      unread: sumValues(counters.unreads),
    };
  },
} satisfies StatsProvider;
