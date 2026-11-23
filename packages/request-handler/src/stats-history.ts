import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createBoundedListChannel } from "@homarr/redis";

const logger = createLogger({ module: "integrationStatsHistory" });

// One sample per 30 seconds, whatever the widgets' refresh interval, so the list always covers 24 hours: a fast
// graph cannot shorten the history a slower graph of the same integration shows.
const BUCKET_MS = 30_000;
const MAX_ITEMS = (24 * 3_600_000) / BUCKET_MS;
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
    const channel = getChannel(integrationId);
    const latest = itemSchema.safeParse(await channel.getLatestAsync());
    const bucket = (at: number) => Math.floor(at / BUCKET_MS);
    if (latest.success && latest.data.identity === identity && bucket(latest.data.time) === bucket(time)) return;
    await channel.pushAsync({ identity, time, values: numeric });
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
