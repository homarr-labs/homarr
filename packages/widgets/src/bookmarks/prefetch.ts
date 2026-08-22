import { createLogger } from "@homarr/core/infrastructure/logs";
import { db, inArray } from "@homarr/db";
import { apps } from "@homarr/db/schema";

import type { Prefetch } from "../definition";
import { createTrpcQueryKey } from "../trpc-query-key";
import { getDirectBookmarkUrl } from "./bookmark-item";

const logger = createLogger({ module: "bookmarksWidgetPrefetch" });

const prefetchAllAsync: Prefetch<"bookmarks"> = async (queryClient, items) => {
  const appIds = items.flatMap((item) => item.options.items.filter((value) => !getDirectBookmarkUrl(value)));
  const distinctAppIds = [...new Set(appIds)];

  const dbApps = await db.query.apps.findMany({
    where: inArray(apps.id, distinctAppIds),
  });

  for (const item of items) {
    const itemAppIds = item.options.items.filter((value) => !getDirectBookmarkUrl(value));
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
