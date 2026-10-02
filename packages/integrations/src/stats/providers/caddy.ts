import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();

const upstreamSchema = z
  .object({
    num_requests: countSchema,
    fails: countSchema,
  })
  .passthrough();

const upstreamsSchema = z.array(upstreamSchema);

const statsSchema = z.object({
  upstreams: countSchema,
  requests: countSchema,
  requestsFailed: countSchema,
});

export const caddyStatsProvider = {
  getHttpAuthentication: () => ({ headers: {} }),
  transport: "axios",
  metrics: [
    { key: "upstreams", label: "Upstreams", unit: "count" },
    { key: "requests", label: "Active requests", unit: "count" },
    { key: "requestsFailed", label: "Failed requests", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/reverse_proxy/upstreams", {
      method: "GET",
      signal: context.signal,
    });
    const upstreams = upstreamsSchema.parse(response);

    return statsSchema.parse({
      upstreams: upstreams.length,
      requests: upstreams.reduce((total, upstream) => total + upstream.num_requests, 0),
      requestsFailed: upstreams.reduce((total, upstream) => total + upstream.fails, 0),
    });
  },
} satisfies StatsProvider;
