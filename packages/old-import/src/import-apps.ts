import { createId, inArray } from "@homarr/db";
import type { Database, InferInsertModel } from "@homarr/db";
import { apps as appsTable } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";
import type { OldmarrApp } from "@homarr/old-schema";

export const insertAppsAsync = async (
  db: Database,
  apps: OldmarrApp[],
  distinctAppsByHref: boolean,
  configName: string,
) => {
  logger.info(
    `Importing old homarr apps configuration=${configName} distinctAppsByHref=${distinctAppsByHref} apps=${apps.length}`,
  );
  const existingAppsWithHref = distinctAppsByHref
    ? await db.query.apps.findMany({
        where: inArray(appsTable.href, [...new Set(apps.map((app) => app.url))]),
      })
    : [];

  logger.debug(`Found existing apps with href count=${existingAppsWithHref.length}`);

  const mappedApps = apps.map((app) => ({
    // Use id of existing app when it has the same href and distinctAppsByHref is true
    newId: distinctAppsByHref
      ? (existingAppsWithHref.find(
          (existingApp) =>
            existingApp.href === (app.behaviour.externalUrl === "" ? app.url : app.behaviour.externalUrl) &&
            existingApp.name === app.name &&
            existingApp.iconUrl === app.appearance.iconUrl,
        )?.id ?? createId())
      : createId(),
    ...app,
  }));

  const appsToCreate = mappedApps
    .filter((app) => !existingAppsWithHref.some((existingApp) => existingApp.id === app.newId))
    .map(
      (app) =>
        ({
          id: app.newId,
          name: app.name,
          iconUrl: app.appearance.iconUrl,
          href: app.behaviour.externalUrl === "" ? app.url : app.behaviour.externalUrl,
          description: app.behaviour.tooltipDescription,
        }) satisfies InferInsertModel<typeof appsTable>,
    );

  logger.debug(`Creating apps count=${appsToCreate.length}`);

  if (appsToCreate.length > 0) {
    await db.insert(appsTable).values(appsToCreate);
  }

  logger.info(`Imported apps count=${appsToCreate.length}`);

  return mappedApps;
};
