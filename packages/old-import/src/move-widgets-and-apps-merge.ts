import { objectEntries } from "@homarr/common";
import { logger } from "@homarr/log";
import type { OldmarrApp, OldmarrConfig, OldmarrWidget } from "@homarr/old-schema";

import { OldHomarrScreenSizeError } from "./import-error";
import { mapColumnCount } from "./mappers/map-column-count";
import type { OldmarrImportConfiguration } from "./settings";

export const moveWidgetsAndAppsIfMerge = (
  old: OldmarrConfig,
  wrapperIdsToMerge: string[],
  configuration: OldmarrImportConfiguration,
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

      const screenSizeShape = app.shape[configuration.screenSize];
      if (!screenSizeShape) {
        throw new OldHomarrScreenSizeError("app", app.id, configuration.screenSize);
      }

      // Find the highest widget in the wrapper to increase the offset accordingly
      if (screenSizeShape.location.y + screenSizeShape.size.height > requiredHeight) {
        requiredHeight = screenSizeShape.location.y + screenSizeShape.size.height;
      }

      // Move item down as much as needed to not overlap with other items
      screenSizeShape.location.y += offset;
    }

    for (const widget of widgets) {
      if (widget.area.type === "sidebar") continue;
      // Move item to first wrapper
      widget.area.properties.id = firstId;

      const screenSizeShape = widget.shape[configuration.screenSize];
      if (!screenSizeShape) {
        throw new OldHomarrScreenSizeError("widget", widget.id, configuration.screenSize);
      }

      // Find the highest widget in the wrapper to increase the offset accordingly
      if (screenSizeShape.location.y + screenSizeShape.size.height > requiredHeight) {
        requiredHeight = screenSizeShape.location.y + screenSizeShape.size.height;
      }

      // Move item down as much as needed to not overlap with other items
      screenSizeShape.location.y += offset;
    }

    offset += requiredHeight;
  }

  if (configuration.sidebarBehaviour === "last-section") {
    const areas = [...old.apps.map((app) => app.area), ...old.widgets.map((widget) => widget.area)];
    if (
      old.settings.customization.layout.enabledLeftSidebar ||
      areas.some((area) => area.type === "sidebar" && area.properties.location === "left")
    ) {
      offset = moveWidgetsAndAppsInLeftSidebar(old, firstId, offset, configuration.screenSize);
    }

    if (
      old.settings.customization.layout.enabledRightSidebar ||
      areas.some((area) => area.type === "sidebar" && area.properties.location === "right")
    ) {
      moveWidgetsAndAppsInRightSidebar(old, firstId, offset, configuration.screenSize);
    }
  } else {
    // Remove all widgets and apps in the sidebar
    return {
      apps: old.apps.filter((app) => app.area.type !== "sidebar"),
      widgets: old.widgets.filter((app) => app.area.type !== "sidebar"),
    };
  }

  return { apps: old.apps, widgets: old.widgets };
};

const moveWidgetsAndAppsInLeftSidebar = (
  old: OldmarrConfig,
  firstId: string,
  offset: number,
  screenSize: OldmarrImportConfiguration["screenSize"],
) => {
  const columnCount = mapColumnCount(old, screenSize);
  let requiredHeight = updateItems({
    // This should work as the reference of the items did not change, only the array reference did
    items: [...old.widgets, ...old.apps],
    screenSize,
    filter: (item) =>
      item.area.type === "sidebar" &&
      item.area.properties.location === "left" &&
      (columnCount >= 2 || item.shape[screenSize]?.location.x === 0),
    update: (item) => {
      const screenSizeShape = item.shape[screenSize];
      if (!screenSizeShape) {
        throw new OldHomarrScreenSizeError("kind" in item ? "widget" : "app", item.id, screenSize);
      }
      // Reduce width to one if column count is one
      if (screenSizeShape.size.width > columnCount) {
        screenSizeShape.size.width = columnCount;
      }

      item.area = {
        type: "wrapper",
        properties: {
          id: firstId,
        },
      };

      screenSizeShape.location.y += offset;
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
    screenSize,
    filter: (item) =>
      item.area.type === "sidebar" &&
      item.area.properties.location === "left" &&
      item.shape[screenSize]?.location.x === 1,
    update: (item) => {
      const screenSizeShape = item.shape[screenSize];
      if (!screenSizeShape) {
        throw new OldHomarrScreenSizeError("kind" in item ? "widget" : "app", item.id, screenSize);
      }

      item.area = {
        type: "wrapper",
        properties: {
          id: firstId,
        },
      };

      screenSizeShape.location.x = 0;
      screenSizeShape.location.y += offset;
    },
  });

  offset += requiredHeight;
  return offset;
};

const moveWidgetsAndAppsInRightSidebar = (
  old: OldmarrConfig,
  firstId: string,
  offset: number,
  screenSize: OldmarrImportConfiguration["screenSize"],
) => {
  const columnCount = mapColumnCount(old, screenSize);
  const xOffsetDelta = Math.max(columnCount - 2, 0);
  const requiredHeight = updateItems({
    // This should work as the reference of the items did not change, only the array reference did
    items: [...old.widgets, ...old.apps],
    screenSize,
    filter: (item) =>
      item.area.type === "sidebar" &&
      item.area.properties.location === "right" &&
      (columnCount >= 2 || item.shape[screenSize]?.location.x === 0),
    update: (item) => {
      const screenSizeShape = item.shape[screenSize];
      if (!screenSizeShape) {
        throw new OldHomarrScreenSizeError("kind" in item ? "widget" : "app", item.id, screenSize);
      }

      // Reduce width to one if column count is one
      if (screenSizeShape.size.width > columnCount) {
        screenSizeShape.size.width = columnCount;
      }

      item.area = {
        type: "wrapper",
        properties: {
          id: firstId,
        },
      };

      screenSizeShape.location.y += offset;
      screenSizeShape.location.x += xOffsetDelta;
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
    screenSize,
    filter: (item) =>
      item.area.type === "sidebar" &&
      item.area.properties.location === "left" &&
      item.shape[screenSize]?.location.x === 1,
    update: (item) => {
      const screenSizeShape = item.shape[screenSize];
      if (!screenSizeShape) {
        throw new OldHomarrScreenSizeError("kind" in item ? "widget" : "app", item.id, screenSize);
      }

      item.area = {
        type: "wrapper",
        properties: {
          id: firstId,
        },
      };

      screenSizeShape.location.x = 0;
      screenSizeShape.location.y += offset;
    },
  });
};

const createItemSnapshot = (
  item: OldmarrApp | OldmarrWidget,
  screenSize: OldmarrImportConfiguration["screenSize"],
) => ({
  x: item.shape[screenSize]?.location.x,
  y: item.shape[screenSize]?.location.y,
  height: item.shape[screenSize]?.size.height,
  width: item.shape[screenSize]?.size.width,
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
  screenSize: OldmarrImportConfiguration["screenSize"];
}) => {
  const items = options.items.filter(options.filter);
  let requiredHeight = 0;
  for (const item of items) {
    const before = createItemSnapshot(item, options.screenSize);

    const screenSizeShape = item.shape[options.screenSize];
    if (!screenSizeShape) {
      throw new OldHomarrScreenSizeError("kind" in item ? "widget" : "app", item.id, options.screenSize);
    }

    if (screenSizeShape.location.y + screenSizeShape.size.height > requiredHeight) {
      requiredHeight = screenSizeShape.location.y + screenSizeShape.size.height;
    }

    options.update(item);
    const after = createItemSnapshot(item, options.screenSize);

    logger.debug(
      `Moved item ${item.id}\n [snapshot before]: ${before.toString()}\n [snapshot after]: ${after.toString()}`,
    );
  }

  return requiredHeight;
};
