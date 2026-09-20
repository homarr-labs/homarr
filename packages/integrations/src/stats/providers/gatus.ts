import { z } from "zod";

import type { StatsProvider } from "../types";

const endpointResultSchema = z
  .object({
    success: z.boolean(),
  })
  .passthrough();

const endpointSchema = z
  .object({
    results: z.array(endpointResultSchema),
  })
  .passthrough();

const endpointsSchema = z.union([z.array(endpointSchema), z.record(z.string(), endpointSchema)]);

export const gatusStatsProvider = {
  getHttpAuthentication: () => ({ headers: {} }),
  metrics: [
    { key: "up", label: "Up", unit: "count" },
    { key: "down", label: "Down", unit: "count" },
    { key: "unknown", label: "Unknown", unit: "count" },
    { key: "total", label: "Total", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/v1/endpoints/statuses", {
      signal: context.signal,
    });
    const endpoints = Object.values(endpointsSchema.parse(response));

    const up = endpoints.filter((endpoint) => endpoint.results.at(-1)?.success === true).length;
    const down = endpoints.filter((endpoint) => endpoint.results.at(-1)?.success === false).length;

    return {
      up,
      down,
      unknown: endpoints.length - up - down,
      total: endpoints.length,
    };
  },
} satisfies StatsProvider;
