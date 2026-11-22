import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createBoundedListChannel } from "@homarr/redis";

const logger = createLogger({ module: "integrationStatsHistory" });

// 24 hours at the default 30 second graph refresh interval.
const MAX_ITEMS = 2880;
const itemSchema = z.object({
  identity: z.string(),
  time: z.number(),
  values: z.record(z.string(), z.number().finite()),
});
export type StatsHistoryItem = z.infer<typeof itemSchema>;

const getChannel = (integrationId: string) =>
  createBoundedListChannel<StatsHistoryItem>(`integration-stats:history:v1:${integrationId}`, {
    maxItems: MAX_ITEMS,
    useBoundedCacheClient: true,
  });

export const appendStatsHistoryAsync = async (
  integrationId: string,
  identity: string,
  values: Record<string, unknown>,
  time: number,
) => {
  const numeric: Record<string, number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "number" && Number.isFinite(value)) numeric[key] = value;
  }
  if (Object.keys(numeric).length === 0) return;
  try {
    await getChannel(integrationId).pushAsync({ identity, time, values: numeric });
  } catch (error) {
    logger.warn("Failed to record statistics history", { integrationId, error });
  }
};

/**
 * Returns the recorded items for the current credentials, oldest first.
 * Items recorded with other credentials or another URL are ignored.
 */
export const readStatsHistoryAsync = async (integrationId: string, identity: string, since: number) => {
  const items = await getChannel(integrationId).getAllAsync();
  return items
    .map((item) => itemSchema.safeParse(item))
    .flatMap((result) => (result.success ? [result.data] : []))
    .filter((item) => item.identity === identity && item.time >= since)
    .toReversed();
};
