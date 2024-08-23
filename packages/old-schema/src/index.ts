import SuperJSON from "superjson";

import type { Database, InferInsertModel } from "@homarr/db";
import { createId, inArray } from "@homarr/db";
import { apps as appsTable, boards, items, sections } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";

import type { WidgetComponentProps } from "../../widgets/src/definition";
import type { OldmarrApp, OldmarrConfig, OldmarrWidget } from "./config";
import { mapColor } from "./mappers/map-colors";
import { mapKind } from "./widgets/definitions";
import { mapOptions } from "./widgets/options";

export type { OldmarrConfig } from "./config";

const fixSectionIssues = (old: OldmarrConfig) => {
  const wrappers = old.wrappers.sort((wrapperA, wrapperB) => wrapperA.position - wrapperB.position);
  const categories = old.categories.sort((categoryA, categoryB) => categoryA.position - categoryB.position);

  const neededSectionCount = categories.length * 2 + 1;
  const hasToMuchEmptyWrappers = wrappers.length > categories.length + 1;

  for (let position = 0; position < neededSectionCount; position++) {
    const index = Math.floor(position / 2);
    const isEmpty = position % 2 == 0;
    const section = isEmpty ? wrappers[index] : categories[index];
    if (!section) {
      // If there are not enough empty sections for categories we need to insert them
      if (isEmpty) {
        // Insert empty wrapper for between categories
        wrappers.push({
          id: createId(),
          position,
        });
      }
      continue;
    }

    section.position = position;
  }

  // If there are to many empty wrappers we need to merge those after the last category
  let wrapperIdsToMerge: string[] = [];
  if (hasToMuchEmptyWrappers) {
    // Find all wrappers that should be merged into one
    wrapperIdsToMerge = wrappers.slice(categories.length).map((section) => section.id);
    // Remove all wrappers after the first at the end
    wrappers.splice(categories.length + 1);
  }

  return {
    wrappers,
    categories,
    wrapperIdsToMerge,
  };
};

const moveWidgetAndAppsIfMerge = (old: OldmarrConfig, wrapperIdsToMerge: string[]) => {
  const firstId = wrapperIdsToMerge[0];
  if (!firstId) {
    return { apps: old.apps, widgets: old.widgets };
  }

  const affectedMap = new Map<string, { apps: OldmarrApp[]; widgets: OldmarrWidget[] }>(
    wrapperIdsToMerge.map((id) => [
      id,
      {
        apps: old.apps.filter((app) => app.area.type !== "sidebar" && id === app.area.properties.id),
        widgets: old.widgets.filter((app) => app.area.type !== "sidebar" && id === app.area.properties.id),
      },
    ]),
  );

  let offset = 0;
  for (const id of wrapperIdsToMerge) {
    let requiredHeight = 0;
    const affected = affectedMap.get(id);
    if (!affected) {
      continue;
    }

    const apps = affected.apps;
    const widgets = affected.widgets;

    for (const app of apps) {
      if (app.area.type === "sidebar") continue;
      // Move item to first wrapper
      app.area.properties.id = firstId;

      // Find the highest widget in the wrapper to increase the offset accordingly
      if (app.shape.lg.location.y + app.shape.lg.size.height > requiredHeight) {
        requiredHeight = app.shape.lg.location.y + app.shape.lg.size.height;
      }

      // Move item down as much as needed to not overlap with other items
      app.shape.lg.location.y += offset;
    }

    for (const widget of widgets) {
      if (widget.area.type === "sidebar") continue;
      // Move item to first wrapper
      widget.area.properties.id = firstId;

      // Find the highest widget in the wrapper to increase the offset accordingly
      if (widget.shape.lg.location.y + widget.shape.lg.size.height > requiredHeight) {
        requiredHeight = widget.shape.lg.location.y + widget.shape.lg.size.height;
      }

      // Move item down as much as needed to not overlap with other items
      widget.shape.lg.location.y += offset;
    }

    offset += requiredHeight;
  }

  return { apps: old.apps, widgets: old.widgets };
};

// TODO: Items in the sidebar are not imported yet
export const importAsync = async (db: Database, old: OldmarrConfig, distinctAppsByHref: boolean) => {
  const { wrappers, categories, wrapperIdsToMerge } = fixSectionIssues(old);
  const { apps, widgets } = moveWidgetAndAppsIfMerge(old, wrapperIdsToMerge);

  const boardId = await insertBoardAsync(db, old);
  const sectionIdMaps = await insertSectionsAsync(db, categories, wrappers, boardId);
  const mappedApps = await insertAppsAsync(db, apps, distinctAppsByHref);
  await insertItemsAsync(db, widgets, mappedApps, sectionIdMaps);
};

const insertBoardAsync = async (db: Database, old: OldmarrConfig) => {
  const boardId = createId();
  await db.insert(boards).values({
    id: boardId,
    name: old.configProperties.name,
    backgroundImageAttachment: old.settings.customization.backgroundImageAttachment,
    backgroundImageUrl: old.settings.customization.backgroundImageUrl,
    backgroundImageRepeat: old.settings.customization.backgroundImageRepeat,
    backgroundImageSize: old.settings.customization.backgroundImageSize,
    columnCount: old.settings.customization.gridstack?.columnCountLarge ?? 12,
    faviconImageUrl: old.settings.customization.faviconUrl,
    isPublic: old.settings.access.allowGuests,
    logoImageUrl: old.settings.customization.logoImageUrl,
    pageTitle: old.settings.customization.pageTitle,
    metaTitle: old.settings.customization.metaTitle,
    opacity: old.settings.customization.appOpacity,
    primaryColor: mapColor(old.settings.customization.colors.primary, "#fa5252"),
    secondaryColor: mapColor(old.settings.customization.colors.secondary, "#fd7e14"),
  });

  return boardId;
};

const insertSectionsAsync = async (
  db: Database,
  categories: OldmarrConfig["categories"],
  wrappers: OldmarrConfig["wrappers"],
  boardId: string,
) => {
  const wrapperIds = wrappers.map((section) => section.id);
  const categoryIds = categories.map((section) => section.id);
  const idMaps = new Map<string, string>([...wrapperIds, ...categoryIds].map((id) => [id, createId()]));

  const wrappersToInsert = wrappers.map((section) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: idMaps.get(section.id)!,
    boardId,
    xOffset: 0,
    yOffset: section.position,
    kind: "empty" as const,
  }));

  const categoriesToInsert = categories.map((section) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    id: idMaps.get(section.id)!,
    boardId,
    xOffset: 0,
    yOffset: section.position,
    kind: "category" as const,
    name: section.name,
  }));

  if (wrappersToInsert.length > 0) {
    await db.insert(sections).values(wrappersToInsert);
  }

  if (categoriesToInsert.length > 0) {
    await db.insert(sections).values(categoriesToInsert);
  }

  return idMaps;
};

const insertAppsAsync = async (db: Database, apps: OldmarrApp[], distinctAppsByHref: boolean) => {
  const existingAppsWithHref = distinctAppsByHref
    ? await db.query.apps.findMany({
        where: inArray(appsTable.href, [...new Set(apps.map((app) => app.url))]),
      })
    : [];

  const mappedApps = apps.map((app) => ({
    // Use id of existing app when it has the same href and distinctAppsByHref is true
    newId: distinctAppsByHref
      ? (existingAppsWithHref.find(
          (existingApp) =>
            existingApp.href === (app.behaviour.externalUrl === "" ? app.url : app.behaviour.externalUrl),
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

  if (appsToCreate.length > 0) {
    await db.insert(appsTable).values(appsToCreate);
  }

  return mappedApps;
};

const insertItemsAsync = async (
  db: Database,
  widgets: OldmarrWidget[],
  mappedApps: (OldmarrApp & { newId: string })[],
  sectionIdMaps: Map<string, string>,
) => {
  const normalWidgets = widgets.filter((widget) => widget.area.type !== "sidebar");

  for (const widget of normalWidgets) {
    if (widget.area.type === "sidebar") {
      // Ignore apps in the sidebar for now
      continue;
    }

    const kind = mapKind(widget.type);

    if (!kind) {
      logger.error(`Widget ${widget.id} has no kind`);
      continue;
    }

    const sectionId = sectionIdMaps.get(widget.area.properties.id);
    if (!sectionId) {
      logger.error(`Widget ${widget.id} has no section id`);
      continue;
    }

    logger.info(`Inserting widget ${widget.id} into section ${sectionId}`);

    await db.insert(items).values({
      id: createId(),
      sectionId,
      height: widget.shape.lg.size.height,
      width: widget.shape.lg.size.width,
      xOffset: widget.shape.lg.location.x,
      yOffset: widget.shape.lg.location.y,
      kind,
      options: SuperJSON.stringify(mapOptions(kind, widget.properties)),
    });

    logger.info(`Inserted widget ${widget.id} into section ${sectionId}`);
  }

  for (const app of mappedApps) {
    if (app.area.type === "sidebar") {
      // Ignore apps in the sidebar for now
      continue;
    }
    const sectionId = sectionIdMaps.get(app.area.properties.id);
    if (!sectionId) {
      logger.error(`App ${app.id} has no section id`);
      continue;
    }

    logger.info(`Inserting app ${app.name} into section ${sectionId}`);

    await db.insert(items).values({
      id: createId(),
      sectionId,
      height: app.shape.lg.size.height,
      width: app.shape.lg.size.width,
      xOffset: app.shape.lg.location.x,
      yOffset: app.shape.lg.location.y,
      kind: "app",
      options: SuperJSON.stringify({
        appId: app.newId,
        openInNewTab: app.behaviour.isOpeningNewTab,
        pingEnabled: app.network.enabledStatusChecker,
        showDescriptionTooltip: app.behaviour.tooltipDescription !== "",
        showTitle: app.appearance.appNameStatus === "normal",
      } satisfies WidgetComponentProps<"app">["options"]),
    });
  }
};
