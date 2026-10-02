import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();
const summarySchema = z
  .object({
    data: z.object({
      summary: z.record(
        z.string(),
        z.object({
          device: z.object({ archived: z.boolean(), device_status: z.number().int() }).passthrough(),
        }),
      ),
    }),
  })
  .passthrough();
const settingsSchema = z
  .object({
    settings: z.object({ metrics: z.object({ status_threshold: z.number().int() }).passthrough() }).passthrough(),
  })
  .passthrough();

const status = { passed: 0, failedSmart: 1, failedScrutiny: 2, failedBoth: 3 } as const;

export const scrutinyStatsProvider = {
  getHttpAuthentication: () => ({ headers: {} }),
  metrics: [
    { key: "passed", label: "Passed devices", unit: "count" },
    { key: "failed", label: "Failed devices", unit: "count" },
    { key: "unknown", label: "Unknown devices", unit: "count" },
  ],
  async fetchAsync(context) {
    const [summaryResponse, settingsResponse] = await Promise.all([
      context.requestAsync("/api/summary", { signal: context.signal }),
      context.requestAsync("/api/settings", { signal: context.signal }),
    ]);
    const summary = summarySchema.parse(summaryResponse);
    const threshold = settingsSchema.parse(settingsResponse).settings.metrics.status_threshold;
    const devices = Object.values(summary.data.summary).filter(({ device }) => !device.archived);
    const failed = devices.filter(({ device }) => {
      if (threshold === status.failedBoth)
        return device.device_status > status.passed && device.device_status <= status.failedBoth;
      return device.device_status === threshold || device.device_status === status.failedBoth;
    }).length;
    const unknown = devices.filter(
      ({ device }) => device.device_status < status.passed || device.device_status > status.failedBoth,
    ).length;

    return {
      passed: countSchema.parse(devices.length - failed - unknown),
      failed: countSchema.parse(failed),
      unknown: countSchema.parse(unknown),
    };
  },
} satisfies StatsProvider;
