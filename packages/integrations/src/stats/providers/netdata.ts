import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();

const infoSchema = z
  .object({
    alarms: z
      .object({
        warning: countSchema,
        critical: countSchema,
      })
      .passthrough(),
  })
  .passthrough();

export const netdataStatsProvider = {
  metrics: [
    { key: "warnings", label: "Warnings", unit: "count" },
    { key: "criticals", label: "Criticals", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/v1/info", {
      signal: context.signal,
    });
    const info = infoSchema.parse(response);

    return {
      warnings: info.alarms.warning,
      criticals: info.alarms.critical,
    };
  },
} satisfies StatsProvider;
