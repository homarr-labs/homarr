import { cache } from "react";
import type { QueryClient } from "@tanstack/react-query";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { db } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";
import type { WidgetKind } from "@homarr/definitions";
import { createWidgetPrefetchCache } from "@homarr/redis";
import { createSettings } from "@homarr/settings/creator";

import { reduceWidgetOptionsWithDefaultValues } from ".";
import prefetchForApps from "./app/prefetch";
import prefetchForBookmarks from "./bookmarks/prefetch";
import type { Prefetch, WidgetOptionsRecordOf } from "./definition";
import type { inferOptionsFromCreator } from "./options";

const logger = createLogger({ module: "widgetPrefetch" });
const cachedGetServerSettingsAsync = cache(getServerSettingsAsync);

const prefetchCallbacks: Partial<{
  [TKind in WidgetKind]: Prefetch<TKind>;
}> = {
  bookmarks: prefetchForBookmarks,
  app: prefetchForApps,
};

/**
 * POC: Try to read widget prefetch data from Redis cache first.
 * Falls back to the original database-backed prefetch on cache miss.
 *
 * When Redis has cached data (populated by cron jobs or previous page loads),
 * this avoids database queries entirely — estimated 2-5x faster TTFB.
 *
 * The cache is populated after a successful database prefetch (write-through).
 * TTL is 5 minutes to match cron job intervals.
 */
export const prefetchForKindAsync = async <TKind extends WidgetKind>(
  kind: TKind,
  queryClient: QueryClient,
  items: {
    options: inferOptionsFromCreator<WidgetOptionsRecordOf<TKind>>;
    integrationIds: string[];
  }[],
) => {
  const callback = prefetchCallbacks[kind];
  if (!callback) {
    return;
  }

  const serverSettings = await cachedGetServerSettingsAsync(db);

  const itemsWithDefaultOptions = items.map((item) => ({
    ...item,
    options: reduceWidgetOptionsWithDefaultValues(kind, createSettings({ user: null, serverSettings }), item.options),
  }));

  // POC: Try Redis cache first for widget prefetch data
  try {
    const cacheChannel = createWidgetPrefetchCache(kind);
    const cached = await cacheChannel.getAsync();
    if (cached) {
      // Cache hit: populate query client from Redis instead of database
      for (const [key, value] of Object.entries(cached.data)) {
        queryClient.setQueryData(JSON.parse(key), value);
      }
      logger.debug(`Widget prefetch cache hit for kind '${kind}'`);
      return;
    }
  } catch (error) {
    // Redis unavailable or parse error — fall through to database
    logger.debug(`Widget prefetch cache miss/error for kind '${kind}', falling back to database`);
  }

  // Cache miss: prefetch from database (original path)
  await callback(queryClient, itemsWithDefaultOptions as never[]);

  // POC: Write-through — cache the prefetched data for next request
  try {
    const cacheChannel = createWidgetPrefetchCache(kind);
    const queryCache = queryClient.getQueryCache().getAll();
    const cacheData: Record<string, unknown> = {};
    for (const query of queryCache) {
      if (query.state.data !== undefined) {
        cacheData[JSON.stringify(query.queryKey)] = query.state.data;
      }
    }
    if (Object.keys(cacheData).length > 0) {
      await cacheChannel.setAsync(cacheData);
      logger.debug(`Widget prefetch cache populated for kind '${kind}' (${Object.keys(cacheData).length} entries)`);
    }
  } catch {
    // Non-critical: cache write failure doesn't affect the user
  }
};
