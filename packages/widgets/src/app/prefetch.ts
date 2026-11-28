import { db, inArray } from "@homarr/db";
import { apps } from "@homarr/db/schema";
import { getAppWithVisibleDockerLink } from "@homarr/validation/app";

import type { QueryClient } from "@tanstack/react-query";

import { createLogger } from "@homarr/core/infrastructure/logs";

import { createTrpcQueryKey } from "../trpc-query-key";

const logger = createLogger({ module: "appWidgetPrefetch" });

const prefetchAll = (
  queryClient: QueryClient,
  items: { options: Record<string, unknown> }[],
  canReadDockerLink: Promise<boolean> = Promise.resolve(false),
) => {
  const appIds: string[] = [];
  for (const item of items) {
    if (typeof item.options.appId === "string" && item.options.appId.length > 0) appIds.push(item.options.appId);
  }
  const distinctAppIds = [...new Set(appIds)];
  if (distinctAppIds.length === 0) return;

  const dbAppsPromise = Promise.all([
    db.query.apps.findMany({ where: inArray(apps.id, distinctAppIds) }),
    canReadDockerLink,
  ])
    .then(([rows, canRead]) => rows.map((app) => getAppWithVisibleDockerLink(app, canRead)))
    .catch((error: unknown) => {
      logger.error(new Error("Failed to prefetch apps for app widgets", { cause: error }));
      throw error;
    });
  const appsByIdPromise = dbAppsPromise.then((rows) => {
    const appsById = new Map<string, (typeof rows)[number]>();
    for (const app of rows) {
      if (!appsById.has(app.id)) appsById.set(app.id, app);
    }
    return appsById;
  });

  for (const id of distinctAppIds) {
    void queryClient.prefetchQuery({
      queryKey: createTrpcQueryKey("app.byId", { id }),
      queryFn: async () => {
        const app = (await appsByIdPromise).get(id);
        if (!app) throw new Error("App not found");
        return app;
      },
    });
  }
};

export default prefetchAll;
