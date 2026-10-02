import { z } from "zod";

import type { StatsProvider } from "../types";

const spoolSchema = z.object({
  id: z.number().finite().int().nonnegative(),
  remaining_weight: z.number().finite().nonnegative().nullish(),
  archived: z.boolean(),
});

const spoolListSchema = z.array(spoolSchema);

export const spoolmanStatsProvider = {
  getHttpAuthentication: () => ({ headers: {} }),
  metrics: [
    { key: "spools", label: "Spools", unit: "count" },
    { key: "remainingWeight", label: "Remaining weight", unit: "grams" },
  ],

  async fetchAsync(context) {
    const response = await context.requestAsync("/api/v1/spool", { signal: context.signal });
    const spools = spoolListSchema.parse(response).filter((spool) => !spool.archived);

    let remainingWeight: number | null = 0;
    for (const spool of spools) {
      if (spool.remaining_weight == null) {
        remainingWeight = null;
        break;
      }
      remainingWeight += spool.remaining_weight;
    }

    return {
      spools: spools.length,
      remainingWeight,
    };
  },
} satisfies StatsProvider;
