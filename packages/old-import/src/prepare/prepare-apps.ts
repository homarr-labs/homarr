import type { InferInsertModel, InferSelectModel } from "@homarr/db";
import { createId } from "@homarr/db/client";
import type { apps as appsTable } from "@homarr/db/schema/sqlite";
import type { OldmarrConfig } from "@homarr/old-schema";

import { getAppsFromOldmarrConfig } from "../apps";
import { doAppsMatch } from "../compare/apps";

type DbAppWithoutId = Omit<InferSelectModel<typeof appsTable>, "id">;

interface AppMapping extends DbAppWithoutId {
  ids: string[];
  newId: string;
  exists: boolean;
}

export const prepareApps = (old: OldmarrConfig, existingApps: InferSelectModel<typeof appsTable>[]) => {
  const mappedApps = getAppsFromOldmarrConfig(old);

  const appsToCreate: InferInsertModel<typeof appsTable>[] = [];
  const appMappings: AppMapping[] = [];

  for (const app of mappedApps) {
    const previous = appMappings.find((previousApp) => doAppsMatch(app, previousApp));
    if (previous) {
      previous.ids.push(app.id);
      continue;
    }

    const existing = existingApps.find((existingApp) => doAppsMatch(app, existingApp));
    if (existing) {
      appMappings.push({
        ids: [app.id],
        newId: existing.id,
        name: existing.name,
        href: existing.href,
        iconUrl: existing.iconUrl,
        description: existing.description,
        exists: true,
      });
      continue;
    }

    const newId = createId();
    appMappings.push({
      ids: [app.id],
      newId,
      ...app,
      exists: false,
    });

    appsToCreate.push({
      ...app,
      id: newId,
    });
  }

  // Generates a map from old key to new key for all apps
  return {
    map: new Map(
      appMappings
        .map((app) => app.ids.map((id) => ({ id, newId: app.newId })))
        .flat()
        .map(({ id, newId }) => [id, newId]),
    ),
    appsToCreate,
  };
};
