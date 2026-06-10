import superjson from "superjson";

import { createId } from "@homarr/common";
import {
  defaultBookmarkApps,
  defaultWidgetConfigs,
  emptySuperJSON,
  getWidgetKindsForIntegration,
} from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";

import type { Database } from "..";
import { integrationItems, itemLayouts, items } from "../schema";
import type { Integration } from "../schema";

const widgetConfigMap = new Map(defaultWidgetConfigs.map((config) => [config.kind, config]));

interface BoardTarget {
  boardId: string;
  sectionId: string;
  layoutId: string;
  columnCount: number;
}

interface PlacementContext extends BoardTarget {
  xOffset: number;
  yOffset: number;
  rowMaxHeight: number;
}

const placeWidgetAsync = async (
  db: Database,
  ctx: PlacementContext,
  kind: WidgetKind,
  linkedIntegrationIds: string[],
  options?: string,
  size?: { width: number; height: number },
) => {
  const itemWidth = size?.width ?? 2;
  const itemHeight = size?.height ?? 2;

  if (ctx.xOffset + itemWidth > ctx.columnCount) {
    ctx.xOffset = 0;
    ctx.yOffset += ctx.rowMaxHeight;
    ctx.rowMaxHeight = 0;
  }

  const itemId = createId();
  await db.insert(items).values({
    id: itemId,
    boardId: ctx.boardId,
    kind,
    options: options ?? emptySuperJSON,
    advancedOptions: emptySuperJSON,
  });

  await db.insert(itemLayouts).values({
    itemId,
    sectionId: ctx.sectionId,
    layoutId: ctx.layoutId,
    xOffset: ctx.xOffset,
    yOffset: ctx.yOffset,
    width: itemWidth,
    height: itemHeight,
  });

  for (const integrationId of linkedIntegrationIds) {
    await db.insert(integrationItems).values({ itemId, integrationId });
  }

  ctx.rowMaxHeight = Math.max(ctx.rowMaxHeight, itemHeight);
  ctx.xOffset += itemWidth;
};

interface App {
  id: string;
  name: string;
}

export const placeAllWidgetsAsync = async (
  db: Database,
  target: BoardTarget,
  allIntegrations: Integration[],
  allApps: App[],
) => {
  const ctx: PlacementContext = {
    ...target,
    xOffset: 0,
    yOffset: 0,
    rowMaxHeight: 0,
  };

  const placedWidgets = new Set<WidgetKind>();

  for (const integration of allIntegrations) {
    for (const widgetKind of getWidgetKindsForIntegration(integration.kind)) {
      if (placedWidgets.has(widgetKind)) continue;
      const config = widgetConfigMap.get(widgetKind);
      if (config?.skip) continue;
      placedWidgets.add(widgetKind);

      const matchingIds = allIntegrations
        .filter((row) => getWidgetKindsForIntegration(row.kind).includes(widgetKind))
        .map((row) => row.id);

      const options = config?.options ? superjson.stringify(config.options) : undefined;
      await placeWidgetAsync(
        db,
        ctx,
        widgetKind,
        matchingIds,
        options,
        config && { width: config.width, height: config.height },
      );
    }
  }

  for (const app of allApps) {
    await placeWidgetAsync(
      db,
      ctx,
      "app",
      [],
      superjson.stringify({ appId: app.id, openInNewTab: true, showTitle: true }),
      { width: 1, height: 1 },
    );
  }

  const bookmarkAppNames = new Set(defaultBookmarkApps.map((bookmark) => bookmark.name));
  const bookmarkAppIds = allApps.filter((app) => bookmarkAppNames.has(app.name)).map((app) => app.id);

  for (const config of defaultWidgetConfigs) {
    if (config.skip || placedWidgets.has(config.kind)) continue;
    placedWidgets.add(config.kind);

    let options = config.options ? { ...config.options } : undefined;
    if (config.kind === "bookmarks" && bookmarkAppIds.length > 0) {
      options = { ...options, items: bookmarkAppIds };
    }

    await placeWidgetAsync(db, ctx, config.kind, [], options ? superjson.stringify(options) : undefined, {
      width: config.width,
      height: config.height,
    });
  }

  return placedWidgets.size + allApps.length;
};
