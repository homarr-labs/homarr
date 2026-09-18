import { z } from "zod";

import type { StatsProvider } from "../types";

const totalSchema = z.union([z.number().finite().int().nonnegative(), z.string().regex(/^\d+$/)]).transform(Number);
const totalsSchema = z.tuple([totalSchema, totalSchema, totalSchema, totalSchema, totalSchema]).rest(totalSchema);

export const netalertxStatsProvider = {
  metrics: [
    { key: "total", label: "Total devices", unit: "count" },
    { key: "connected", label: "Connected devices", unit: "count" },
    { key: "newDevices", label: "New devices", unit: "count" },
    { key: "downAlerts", label: "Down alerts", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/devices/totals", {
      headers: { Authorization: `Bearer ${context.secret("apiKey")}` },
      signal: context.signal,
    });
    const totals = totalsSchema.parse(response);
    return { total: totals[0], connected: totals[1], newDevices: totals[3], downAlerts: totals[4] };
  },
} satisfies StatsProvider;
