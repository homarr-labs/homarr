import SuperJSON from "superjson";

import type { Database } from "@homarr/db";
import { createId } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";

import type { WidgetComponentProps } from "../../../widgets/src";
import type { OldmarrApp, OldmarrWidget } from "../config";
import { mapKind } from "../widgets/definitions";
import { mapOptions } from "../widgets/options";

export const insertItemsAsync = async (
  db: Database,
  widgets: OldmarrWidget[],
  mappedApps: (OldmarrApp & { newId: string })[],
  sectionIdMaps: Map<string, string>,
) => {
  logger.info(`Importing old homarr items widgets=${widgets.length} apps=${mappedApps.length}`);

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

    logger.debug(`Inserted widget id=${widget.id} sectionId=${sectionId}`);
  }

  for (const app of mappedApps) {
    // All items should have been moved to the last wrapper
    if (app.area.type === "sidebar") {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sectionId = sectionIdMaps.get(app.area.properties.id)!;

    logger.debug(`Inserting app name=${app.name} sectionId=${sectionId}`);

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

    logger.debug(`Inserted app name=${app.name} sectionId=${sectionId}`);
  }
};
