import { z } from "zod";

import type { StatsProvider } from "../types";

const statsSchema = z
  .object({
    cameras: z.record(z.string(), z.unknown()).default({}),
    service: z.object({ uptime: z.number().finite().nonnegative(), version: z.string() }).passthrough(),
  })
  .passthrough();

export const frigateStatsProvider = {
  getHttpAuthentication: () => ({ headers: {} }),
  metrics: [
    { key: "cameras", label: "Cameras", unit: "count" },
    { key: "uptime", label: "Uptime", unit: "seconds" },
    { key: "version", label: "Version", unit: "text" },
  ],
  async fetchAsync(context) {
    const stats = statsSchema.parse(await context.requestAsync("/api/stats", { signal: context.signal }));
    return { cameras: Object.keys(stats.cameras).length, uptime: stats.service.uptime, version: stats.service.version };
  },
} satisfies StatsProvider;
