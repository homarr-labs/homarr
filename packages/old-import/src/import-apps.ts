import { createId, inArray } from "@homarr/db";
import type { Database, InferInsertModel, InferSelectModel } from "@homarr/db";
import { apps as appsTable } from "@homarr/db/schema";
import { logger } from "@homarr/log";
import type { OldmarrApp } from "@homarr/old-schema";

import type { BookmarkApp } from "./widgets/definitions/bookmark";

type DbAppWithoutId = Omit<InferSelectModel<typeof appsTable>, "id">;

interface AppMapping extends DbAppWithoutId {
  ids: string[];
  newId: string;
  exists: boolean;
}

export const insertAppsAsync = async (
  db: Database,
  apps: OldmarrApp[],
  bookmarkApps: BookmarkApp[],
  distinctAppsByHref: boolean,
  configName: string,
) => {
  logger.info(
    `Importing old homarr apps configuration=${configName} distinctAppsByHref=${distinctAppsByHref} apps=${apps.length}`,
  );

  const existingAppsWithHref = distinctAppsByHref
    ? await db.query.apps.findMany({
        where: inArray(appsTable.href, [
          ...new Set(apps.map((app) => app.url).concat(bookmarkApps.map((app) => app.href))),
        ]),
      })
    : [];

  logger.debug(`Found existing apps with href count=${existingAppsWithHref.length}`);

  // Generate mappings for all apps from old to new ids
  const appMappings: AppMapping[] = [];
  addMappingFor(apps, appMappings, existingAppsWithHref, convertApp);
  addMappingFor(bookmarkApps, appMappings, existingAppsWithHref, convertBookmarkApp);

  logger.debug(`Mapping apps count=${appMappings.length}`);

  const appsToCreate = appMappings
    .filter((app) => !app.exists)
    .map(
      (app) =>
        ({
          id: app.newId,
          name: app.name,
          iconUrl: app.iconUrl,
          href: app.href,
          description: app.description,
        }) satisfies InferInsertModel<typeof appsTable>,
    );

  logger.debug(`Creating apps count=${appsToCreate.length}`);

  if (appsToCreate.length > 0) {
    await db.insert(appsTable).values(appsToCreate);
  }

  logger.info(`Imported apps count=${appsToCreate.length}`);

  // Generates a map from old key to new key for all apps
  return new Map(
    appMappings
      .map((app) => app.ids.map((id) => ({ id, newId: app.newId })))
      .flat()
      .map(({ id, newId }) => [id, newId]),
  );
};

/**
 * Creates a callback to be used in a find method that compares the old app with the new app
 * @param app either an oldmarr app or a bookmark app
 * @param convertApp a function that converts the app to a new app
 * @returns a callback that compares the old app with the new app and returns true if they are the same
 */
const createFindCallback = <TApp extends OldmarrApp | BookmarkApp>(
  app: TApp,
  convertApp: (app: TApp) => DbAppWithoutId,
) => {
  const oldApp = convertApp(app);

  return (dbApp: DbAppWithoutId) =>
    oldApp.href === dbApp.href &&
    oldApp.name === dbApp.name &&
    oldApp.iconUrl === dbApp.iconUrl &&
    oldApp.description === dbApp.description;
};

/**
 * Adds mappings for the given apps to the appMappings array
 * @param apps apps to add mappings for
 * @param appMappings existing app mappings
 * @param existingAppsWithHref existing apps with href
 * @param convertApp a function that converts the app to a new app
 */
const addMappingFor = <TApp extends OldmarrApp | BookmarkApp>(
  apps: TApp[],
  appMappings: AppMapping[],
  existingAppsWithHref: InferSelectModel<typeof appsTable>[],
  convertApp: (app: TApp) => DbAppWithoutId,
) => {
  for (const app of apps) {
    const previous = appMappings.find(createFindCallback(app, convertApp));
    if (previous) {
      previous.ids.push(app.id);
      continue;
    }

    const existing = existingAppsWithHref.find(createFindCallback(app, convertApp));
    if (existing) {
      appMappings.push({
        ids: [app.id],
        newId: existing.id,
        name: existing.name,
        href: existing.href,
        iconUrl: existing.iconUrl,
        description: existing.description,
        pingUrl: existing.pingUrl,
        exists: true,
      });
      continue;
    }

    appMappings.push({
      ids: [app.id],
      newId: createId(),
      ...convertApp(app),
      exists: false,
    });
  }
};

/**
 * Converts an oldmarr app to a new app
 * @param app oldmarr app
 * @returns new app
 */
const convertApp = (app: OldmarrApp): DbAppWithoutId => ({
  name: app.name,
  href: app.behaviour.externalUrl === "" ? app.url : app.behaviour.externalUrl,
  iconUrl: app.appearance.iconUrl,
  description: app.behaviour.tooltipDescription ?? null,
  pingUrl: app.behaviour.externalUrl.length > 0 ? app.behaviour.externalUrl : null,
});

/**
 * Converts a bookmark app to a new app
 * @param app bookmark app
 * @returns new app
 */
const convertBookmarkApp = (app: BookmarkApp): DbAppWithoutId => ({
  ...app,
  description: null,
  pingUrl: null,
});
