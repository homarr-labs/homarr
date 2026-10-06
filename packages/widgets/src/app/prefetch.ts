import { db, inArray } from "@homarr/db";
import { apps } from "@homarr/db/schema";

import type { QueryClient } from "@tanstack/react-query";

import { createLogger } from "@homarr/core/infrastructure/logs";

import { createTrpcQueryKey } from "../trpc-query-key";

const logger = createLogger({ module: "appWidgetPrefetch" });

const prefetchAll = (queryClient: QueryClient, items: { options: Record<string, unknown> }[]) => {
  const appIds: string[] = [];
  for (const item of items) {
    if (typeof item.options.appId === "string" && item.options.appId.length > 0) appIds.push(item.options.appId);
  }
  const distinctAppIds = [...new Set(appIds)];
  if (distinctAppIds.length === 0) return;

  const dbAppsPromise = Promise.resolve(db.query.apps.findMany({ where: inArray(apps.id, distinctAppIds) })).catch(
    (error: unknown) => {
      logger.error(new Error("Failed to prefetch apps for app widgets", { cause: error }));
      throw error;
    },
  );

  for (const id of distinctAppIds) {
    void queryClient.prefetchQuery({
      queryKey: createTrpcQueryKey("app.byId", { id }),
      queryFn: async () => {
        const app = (await dbAppsPromise).find((candidate) => candidate.id === id);
        if (!app) throw new Error("App not found");
        return app;
      },
    });
  }
};

export default prefetchAll;
