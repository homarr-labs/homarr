import SuperJSON from "superjson";

import { createId, Database, inArray, InferInsertModel } from "@homarr/db";
import { apps, boards, items, sections } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";

import { WidgetComponentProps } from "../../widgets/src/definition";
import { OldmarrApp, OldmarrConfig } from "./config";
import { mapKind } from "./widgets/definitions";
import { mapOptions } from "./widgets/options";

export type { OldmarrConfig } from "./config";

// TODO: Items in the sidebar are not imported yet
export const importAsync = async (db: Database, old: OldmarrConfig, distinctAppsByHref: boolean) => {
  const boardId = await insertBoardAsync(db, old);
  const sectionIdMaps = await insertSectionsAsync(db, old, boardId);
  const mappedApps = await insertAppsAsync(db, old, distinctAppsByHref);
  await insertItemsAsync(db, old, mappedApps, sectionIdMaps);
};

const insertBoardAsync = async (db: Database, old: OldmarrConfig) => {
  const boardId = createId();
  console.log(Object.keys(old));
  console.log(old.configProperties);
  await db.insert(boards).values({
    id: boardId,
    name: old.configProperties.name,
    backgroundImageAttachment: old.settings.customization.backgroundImageAttachment,
    backgroundImageUrl: old.settings.customization.backgroundImageUrl,
    backgroundImageRepeat: old.settings.customization.backgroundImageRepeat,
    backgroundImageSize: old.settings.customization.backgroundImageSize,
    columnCount: old.settings.customization.gridstack?.columnCountLarge,
    faviconImageUrl: old.settings.customization.faviconUrl,
    isPublic: old.settings.access.allowGuests,
    logoImageUrl: old.settings.customization.logoImageUrl,
    pageTitle: old.settings.customization.pageTitle,
    metaTitle: old.settings.customization.metaTitle,
    opacity: old.settings.customization.appOpacity,
    primaryColor: old.settings.customization.colors.primary,
    secondaryColor: old.settings.customization.colors.secondary,
  });

  return boardId;
};

// TODO: positions are the same for one empty section and one category section, please adjust first
const insertSectionsAsync = async (db: Database, old: OldmarrConfig, boardId: string) => {
  const wrapperIds = old.wrappers.map((section) => section.id);
  const categoryIds = old.categories.map((section) => section.id);
  const idMaps = new Map<string, string>([...wrapperIds, ...categoryIds].map((id) => [id, createId()]));

  await db.insert(sections).values(
    old.wrappers.map((section) => ({
      id: idMaps.get(section.id)!,
      boardId,
      xOffset: 0,
      yOffset: section.position,
      kind: "empty" as const,
    })),
  );

  await db.insert(sections).values(
    old.categories.map((section) => ({
      id: idMaps.get(section.id)!,
      boardId,
      xOffset: 0,
      yOffset: section.position,
      kind: "category" as const,
      name: section.name,
    })),
  );

  return idMaps;
};

const insertAppsAsync = async (db: Database, old: OldmarrConfig, distinctAppsByHref: boolean) => {
  const existingAppsWithHref = distinctAppsByHref
    ? await db.query.apps.findMany({
        where: inArray(apps.href, [...new Set(old.apps.map((app) => app.url))]),
      })
    : [];

  const mappedApps = old.apps.map((app) => ({
    // Use id of existing app when it has the same href and distinctAppsByHref is true
    newId: distinctAppsByHref
      ? (existingAppsWithHref.find((existingApp) => existingApp.href === app.behaviour.externalUrl)?.id ?? createId())
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
          href: app.behaviour.externalUrl,
          description: app.behaviour.tooltipDescription,
        }) satisfies InferInsertModel<typeof apps>,
    );

  await db.insert(apps).values(appsToCreate);

  return mappedApps;
};

const insertItemsAsync = async (
  db: Database,
  old: OldmarrConfig,
  mappedApps: (OldmarrApp & { newId: string })[],
  sectionIdMaps: Map<string, string>,
) => {
  const normalWidgets = old.widgets.filter((widget) => widget.area.type !== "sidebar");

  for (const widget of normalWidgets) {
    const kind = mapKind(widget.type);

    const sectionId = "id" in widget.area.properties ? widget.area.properties.id : undefined;
    if (!sectionId) {
      logger.error(`Widget ${widget.id} has no section id`);
      continue;
    }

    await db.insert(items).values({
      id: createId(),
      sectionId,
      height: widget.shape.lg?.size.height!,
      width: widget.shape.lg?.size.width!,
      xOffset: widget.shape.lg?.location.x!,
      yOffset: widget.shape.lg?.location.y!,
      kind,
      options: SuperJSON.stringify(mapOptions(kind, widget.properties)),
    });
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

    await db.insert(items).values({
      id: createId(),
      sectionId,
      height: app.shape.lg?.size.height!,
      width: app.shape.lg?.size.width!,
      xOffset: app.shape.lg?.location.x!,
      yOffset: app.shape.lg?.location.y!,
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
