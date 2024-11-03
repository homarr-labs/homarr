import type { InferSelectModel } from "@homarr/db";
import { createId } from "@homarr/db/client";
import type { apps } from "@homarr/db/schema/sqlite";
import type { OldmarrApp, OldmarrConfig } from "@homarr/old-schema";

import type { BookmarkApp } from "./widgets/definitions/bookmark";

export const getAppsFromOldmarrConfig = (oldmarrConfig: OldmarrConfig): InferSelectModel<typeof apps>[] => {
  const mappedApps = oldmarrConfig.apps.map(convertApp);
  const bookmarkApps = oldmarrConfig.widgets
    .filter((widget) => widget.type === "bookmark")
    .map((widget) => widget.properties.items)
    .flat() as BookmarkApp[];

  return mappedApps.concat(bookmarkApps.map(convertBookmarkApp));
};

/**
 * Converts an oldmarr app to a new app
 * @param app oldmarr app
 * @returns new app
 */
const convertApp = (app: OldmarrApp): InferSelectModel<typeof apps> => ({
  id: createId(),
  name: app.name,
  href: app.behaviour.externalUrl === "" ? app.url : app.behaviour.externalUrl,
  iconUrl: app.appearance.iconUrl,
  description: app.behaviour.tooltipDescription ?? null,
});

/**
 * Converts a bookmark app to a new app
 * @param app bookmark app
 * @returns new app
 */
const convertBookmarkApp = (app: BookmarkApp): InferSelectModel<typeof apps> => ({
  ...app,
  id: createId(),
  description: null,
});
