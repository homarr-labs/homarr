import { db, inArray } from "@homarr/db";
import { apps } from "@homarr/db/schema";

import type { QueryClient } from "@tanstack/react-query";

import { createLogger } from "@homarr/core/infrastructure/logs";

import { createTrpcQueryKey } from "../trpc-query-key";
import { getDirectBookmarkUrl } from "./bookmark-item";

const logger = createLogger({ module: "bookmarksWidgetPrefetch" });

const getAppIds = (options: Record<string, unknown>) => {
  if (!Array.isArray(options.items)) return [];
  return options.items.filter((value): value is string => typeof value === "string" && !getDirectBookmarkUrl(value));
};

const prefetchAll = (queryClient: QueryClient, items: { options: Record<string, unknown> }[]) => {
  const appIds = items.flatMap((item) => getAppIds(item.options));
  const distinctAppIds = [...new Set(appIds)];
  if (distinctAppIds.length === 0) return;

  const dbAppsPromise = Promise.resolve(db.query.apps.findMany({ where: inArray(apps.id, distinctAppIds) })).catch(
    (error: unknown) => {
      logger.error(new Error("Failed to prefetch apps for bookmarks", { cause: error }));
      throw error;
    },
  );

  for (const item of items) {
    const itemAppIds = getAppIds(item.options);
    if (itemAppIds.length === 0) {
      continue;
    }

    void queryClient.prefetchQuery({
      queryKey: createTrpcQueryKey("app.byIds", itemAppIds),
      queryFn: async () => (await dbAppsPromise).filter((app) => itemAppIds.includes(app.id)),
    });
  }
};

export default prefetchAll;
