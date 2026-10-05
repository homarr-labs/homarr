import { z } from "zod";

import type { StatsProvider } from "../types";

const nonNegativeFiniteNumberSchema = z.number().finite().nonnegative();

const statusSchema = z
  .object({
    numActiveSessions: nonNegativeFiniteNumberSchema,
    numConnections: nonNegativeFiniteNumberSchema,
    bytesProxied: nonNegativeFiniteNumberSchema,
  })
  .passthrough();

export const syncthingRelayStatsProvider = {
  getHttpAuthentication: () => ({ headers: {} }),
  metrics: [
    { key: "numActiveSessions", label: "Active sessions", unit: "count" },
    { key: "numConnections", label: "Connections", unit: "count" },
    { key: "bytesProxied", label: "Bytes proxied", unit: "bytes" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/status", { signal: context.signal });
    const status = statusSchema.parse(response);

    return {
      numActiveSessions: status.numActiveSessions,
      numConnections: status.numConnections,
      bytesProxied: status.bytesProxied,
    };
  },
} satisfies StatsProvider;
