import SuperJSON from "superjson";

import type { InferInsertModel } from "@homarr/db";
import { createId } from "@homarr/db/client";
import type { items } from "@homarr/db/schema/sqlite";
import type { OldmarrApp, OldmarrWidget } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import type { WidgetComponentProps } from "../../../widgets/src/definition";
import { OldHomarrScreenSizeError } from "../import-error";
import { mapKind } from "../widgets/definitions";
import { mapOptions } from "../widgets/options";

export const prepareItems = (
  widgets: OldmarrWidget[],
  apps: OldmarrApp[],
  appsMap: Map<string, string>,
  sectionIdMaps: Map<string, string>,
  configuration: OldmarrImportConfiguration,
) => {
  const itemsToCreate: InferInsertModel<typeof items>[] = [];

  for (const widget of widgets) {
    // All items should have been moved to the last wrapper
    if (widget.area.type === "sidebar") {
      continue;
    }

    const kind = mapKind(widget.type);

    if (!kind) {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sectionId = sectionIdMaps.get(widget.area.properties.id)!;

    const screenSizeShape = widget.shape[configuration.screenSize];
    if (!screenSizeShape) {
      throw new OldHomarrScreenSizeError("widget", widget.id, configuration.screenSize);
    }

    itemsToCreate.push({
      id: createId(),
      sectionId,
      height: screenSizeShape.size.height,
      width: screenSizeShape.size.width,
      xOffset: screenSizeShape.location.x,
      yOffset: screenSizeShape.location.y,
      kind,
      options: SuperJSON.stringify(mapOptions(kind, widget.properties, appsMap)),
    });
  }

  for (const app of apps) {
    // All items should have been moved to the last wrapper
    if (app.area.type === "sidebar") {
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sectionId = sectionIdMaps.get(app.area.properties.id)!;

    const screenSizeShape = app.shape[configuration.screenSize];
    if (!screenSizeShape) {
      throw new OldHomarrScreenSizeError("app", app.id, configuration.screenSize);
    }

    itemsToCreate.push({
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
  }

  return itemsToCreate;
};
