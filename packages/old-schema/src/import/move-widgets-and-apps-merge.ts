import { objectEntries } from "@homarr/common";
import { logger } from "@homarr/log";

import type { OldmarrApp, OldmarrConfig, OldmarrWidget } from "../config";
import type { ImportConfiguration } from "./import-configuration";

export const moveWidgetsAndAppsIfMerge = (
  old: OldmarrConfig,
  wrapperIdsToMerge: string[],
  sidebarBehaviour: ImportConfiguration["sidebarBehaviour"],
) => {
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

  logger.debug(`Merging wrappers at the end of the board count=${wrapperIdsToMerge.length}`);

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

  if (sidebarBehaviour === "last-section") {
    const columnCount = old.settings.customization.gridstack.columnCountLarge;

    if (old.settings.customization.layout.enabledLeftSidebar) {
      offset = moveWidgetsAndAppsInLeftSidebar(old, firstId, offset, columnCount);
    }

    if (old.settings.customization.layout.enabledRightSidebar) {
      moveWidgetsAndAppsInRightSidebar(old, firstId, offset, columnCount);
    }
  }

  return { apps: old.apps, widgets: old.widgets };
};

const moveWidgetsAndAppsInLeftSidebar = (old: OldmarrConfig, firstId: string, offset: number, columnCount: number) => {
  let requiredHeight = updateItems({
    // This should work as the reference of the items did not change, only the array reference did
    items: [...old.widgets, ...old.apps],
    filter: (item) =>
      item.area.type === "sidebar" &&
      item.area.properties.location === "left" &&
      (columnCount >= 2 || item.shape.lg.location.x === 0),
    update: (item) => {
      // Reduce width to one if column count is one
      if (item.shape.lg.size.width > columnCount) {
        item.shape.lg.size.width = columnCount;
      }

      item.area = {
        type: "wrapper",
        properties: {
          id: firstId,
        },
      };

      item.shape.lg.location.y += offset;
    },
  });

  // Only increase offset if there are less than 3 columns because then the items have to be stacked
  if (columnCount <= 3) {
    offset += requiredHeight;
  }

  // When column count is 0 we need to stack the items of the sidebar on top of each other
  if (columnCount !== 1) {
    return offset;
  }

  requiredHeight = updateItems({
    // This should work as the reference of the items did not change, only the array reference did
    items: [...old.widgets, ...old.apps],
    filter: (item) =>
      item.area.type === "sidebar" && item.area.properties.location === "left" && item.shape.lg.location.x === 1,
    update: (item) => {
      item.area = {
        type: "wrapper",
        properties: {
          id: firstId,
        },
      };

      item.shape.lg.location.x = 0;
      item.shape.lg.location.y += offset;
    },
  });

  offset += requiredHeight;
  return offset;
};

const moveWidgetsAndAppsInRightSidebar = (old: OldmarrConfig, firstId: string, offset: number, columnCount: number) => {
  const xOffsetDelta = Math.max(columnCount - 2, 0);
  const requiredHeight = updateItems({
    // This should work as the reference of the items did not change, only the array reference did
    items: [...old.widgets, ...old.apps],
    filter: (item) =>
      item.area.type === "sidebar" &&
      item.area.properties.location === "right" &&
      (columnCount >= 2 || item.shape.lg.location.x === 0),
    update: (item) => {
      // Reduce width to one if column count is one
      if (item.shape.lg.size.width > columnCount) {
        item.shape.lg.size.width = columnCount;
      }

      item.area = {
        type: "wrapper",
        properties: {
          id: firstId,
        },
      };

      item.shape.lg.location.y += offset;
      item.shape.lg.location.x += xOffsetDelta;
    },
  });

  // When column count is 0 we need to stack the items of the sidebar on top of each other
  if (columnCount !== 1) {
    return;
  }

  offset += requiredHeight;

  updateItems({
    // This should work as the reference of the items did not change, only the array reference did
    items: [...old.widgets, ...old.apps],
    filter: (item) =>
      item.area.type === "sidebar" && item.area.properties.location === "left" && item.shape.lg.location.x === 1,
    update: (item) => {
      item.area = {
        type: "wrapper",
        properties: {
          id: firstId,
        },
      };

      item.shape.lg.location.x = 0;
      item.shape.lg.location.y += offset;
    },
  });
};

const createItemSnapshot = (item: OldmarrApp | OldmarrWidget) => ({
  x: item.shape.lg.location.x,
  y: item.shape.lg.location.y,
  height: item.shape.lg.size.height,
  width: item.shape.lg.size.width,
  section:
    item.area.type === "sidebar"
      ? {
          type: "sidebar",
          location: item.area.properties.location,
        }
      : {
          type: item.area.type,
          id: item.area.properties.id,
        },
  toString(): string {
    return objectEntries(this)
      .filter(([key]) => key !== "toString")
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(" ");
  },
});

const updateItems = (options: {
  items: (OldmarrApp | OldmarrWidget)[];
  filter: (item: OldmarrApp | OldmarrWidget) => boolean;
  update: (item: OldmarrApp | OldmarrWidget) => void;
}) => {
  const items = options.items.filter(options.filter);
  let requiredHeight = 0;
  for (const item of items) {
    if (item.shape.lg.location.y + item.shape.lg.size.height > requiredHeight) {
      requiredHeight = item.shape.lg.location.y + item.shape.lg.size.height;
    }

    const before = createItemSnapshot(item);
    options.update(item);
    const after = createItemSnapshot(item);

    logger.debug(
      `Moved item ${item.id}\n [snapshot before]: ${before.toString()}\n [snapshot after]: ${after.toString()}`,
    );
  }

  return requiredHeight;
};
