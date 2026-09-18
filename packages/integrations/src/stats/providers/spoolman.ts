import { z } from "zod";

import type { StatsProvider } from "../types";

const spoolSchema = z.object({
  id: z.number().finite().int().nonnegative(),
  remaining_weight: z.number().finite().nonnegative(),
  archived: z.boolean(),
});

const spoolListSchema = z.array(spoolSchema);

export const spoolmanStatsProvider = {
  metrics: [
    { key: "spools", label: "Spools", unit: "count" },
    { key: "remainingWeight", label: "Remaining weight", unit: "grams" },
  ],

  async fetchAsync(context) {
    const response = await context.requestAsync("/api/v1/spool", { signal: context.signal });
    const spools = spoolListSchema.parse(response).filter((spool) => !spool.archived);

    return {
      spools: spools.length,
      remainingWeight: spools.reduce((total, spool) => total + spool.remaining_weight, 0),
    };
  },
} satisfies StatsProvider;
