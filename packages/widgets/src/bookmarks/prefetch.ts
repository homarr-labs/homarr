import { createLogger } from "@homarr/core/infrastructure/logs";
import { db, inArray } from "@homarr/db";
import { apps } from "@homarr/db/schema";

import type { Prefetch } from "../definition";
import { createTrpcQueryKey } from "../trpc-query-key";
import { getDirectBookmarkUrl } from "./bookmark-item";

const logger = createLogger({ module: "bookmarksWidgetPrefetch" });

const getAppIds = (options: Record<string, unknown>) => {
  if (!Array.isArray(options.items)) return [];
  return options.items.filter((value): value is string => typeof value === "string" && !getDirectBookmarkUrl(value));
};

const prefetchAllAsync: Prefetch = async (queryClient, items) => {
  const appIds = items.flatMap((item) => getAppIds(item.options));
  const distinctAppIds = [...new Set(appIds)];

  const dbApps = await db.query.apps.findMany({
    where: inArray(apps.id, distinctAppIds),
  });

  for (const item of items) {
    const itemAppIds = getAppIds(item.options);
    if (itemAppIds.length === 0) {
      continue;
    }

    queryClient.setQueryData(
      createTrpcQueryKey("app.byIds", itemAppIds),
      dbApps.filter((app) => itemAppIds.includes(app.id)),
    );
  }

  logger.info("Successfully prefetched apps for bookmarks", { count: dbApps.length });
};

export default prefetchAllAsync;
