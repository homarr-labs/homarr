import SuperJSON from "superjson";

import type { Database } from "@homarr/db";
import { createId } from "@homarr/db";
import { items } from "@homarr/db/schema";
import { logger } from "@homarr/log";
import type { OldmarrApp, OldmarrWidget } from "@homarr/old-schema";

import type { WidgetComponentProps } from "../../widgets/src/definition";
import { OldHomarrScreenSizeError } from "./import-error";
import type { OldmarrImportConfiguration } from "./settings";
import { mapKind } from "./widgets/definitions";
import { mapOptions } from "./widgets/options";

export const insertItemsAsync = async (
  db: Database,
  widgets: OldmarrWidget[],
  apps: OldmarrApp[],
  appsMap: Map<string, string>,
  sectionIdMaps: Map<string, string>,
  configuration: OldmarrImportConfiguration,
) => {
  logger.info(`Importing old homarr items widgets=${widgets.length} apps=${apps.length}`);

  for (const widget of widgets) {
    // All items should have been moved to the last wrapper
    if (widget.area.type === "sidebar") {
      continue;
    }

    const kind = mapKind(widget.type);

    logger.debug(`Mapped widget kind id=${widget.id} previous=${widget.type} current=${kind}`);

    if (!kind) {
      logger.error(`Widget has no kind id=${widget.id} type=${widget.type}`);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sectionId = sectionIdMaps.get(widget.area.properties.id)!;

    logger.debug(`Inserting widget id=${widget.id} sectionId=${sectionId}`);

    const screenSizeShape = widget.shape[configuration.screenSize];
    if (!screenSizeShape) {
      throw new OldHomarrScreenSizeError("widget", widget.id, configuration.screenSize);
    }

    await db.insert(items).values({
      id: createId(),
      sectionId,
      height: screenSizeShape.size.height,
      width: screenSizeShape.size.width,
      xOffset: screenSizeShape.location.x,
      yOffset: screenSizeShape.location.y,
      kind,
      options: SuperJSON.stringify(mapOptions(widget.type, widget.properties, appsMap)),
    });

    logger.debug(`Inserted widget id=${widget.id} sectionId=${sectionId}`);
  }

  for (const app of apps) {
    // All items should have been moved to the last wrapper
    if (app.area.type === "sidebar") {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sectionId = sectionIdMaps.get(app.area.properties.id)!;

    logger.debug(`Inserting app name=${app.name} sectionId=${sectionId}`);

    const screenSizeShape = app.shape[configuration.screenSize];
    if (!screenSizeShape) {
      throw new OldHomarrScreenSizeError("app", app.id, configuration.screenSize);
    }

    await db.insert(items).values({
      id: createId(),
      sectionId,
      height: screenSizeShape.size.height,
      width: screenSizeShape.size.width,
      xOffset: screenSizeShape.location.x,
      yOffset: screenSizeShape.location.y,
      kind: "app",
      options: SuperJSON.stringify({
        // it's safe to assume that the app exists in the map
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        appId: appsMap.get(app.id)!,
        openInNewTab: app.behaviour.isOpeningNewTab,
        pingEnabled: app.network.enabledStatusChecker,
        showDescriptionTooltip: app.behaviour.tooltipDescription !== "",
        showTitle: app.appearance.appNameStatus === "normal",
      } satisfies WidgetComponentProps<"app">["options"]),
    });

    logger.debug(`Inserted app name=${app.name} sectionId=${sectionId}`);
  }
};
