import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();
const bytesSchema = z.number().finite().nonnegative();

const statsResponseSchema = z
  .object({
    PLATFORMS: countSchema,
    ROMS: countSchema,
    SAVES: countSchema,
    STATES: countSchema,
    SCREENSHOTS: countSchema,
    FILESIZE: bytesSchema.optional(),
    TOTAL_FILESIZE_BYTES: bytesSchema.optional(),
  })
  .passthrough()
  .refine((stats) => stats.FILESIZE !== undefined || stats.TOTAL_FILESIZE_BYTES !== undefined, {
    message: "Expected FILESIZE or TOTAL_FILESIZE_BYTES",
  });

export const rommStatsProvider = {
  metrics: [
    { key: "platforms", label: "Platforms", unit: "count" },
    { key: "roms", label: "ROMs", unit: "count" },
    { key: "saves", label: "Saves", unit: "count" },
    { key: "states", label: "States", unit: "count" },
    { key: "screenshots", label: "Screenshots", unit: "count" },
    { key: "totalFileSize", label: "Total file size", unit: "bytes" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/api/stats", { signal: context.signal });
    const stats = statsResponseSchema.parse(response);
    const totalFileSize = stats.FILESIZE ?? stats.TOTAL_FILESIZE_BYTES;
    if (totalFileSize === undefined) throw new Error("RomM stats did not include a file size");

    return {
      platforms: stats.PLATFORMS,
      roms: stats.ROMS,
      saves: stats.SAVES,
      states: stats.STATES,
      screenshots: stats.SCREENSHOTS,
      totalFileSize,
    };
  },
} satisfies StatsProvider;
