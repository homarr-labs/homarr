import SuperJSON from "superjson";

import type { InferInsertModel } from "@homarr/db";
import { createId } from "@homarr/db";
import type { items } from "@homarr/db/schema/sqlite";
import type { OldmarrApp, OldmarrWidget } from "@homarr/old-schema";

import type { WidgetComponentProps } from "../../../widgets/src/definition";
import { mapKind } from "../widgets/definitions";
import { mapOptions } from "../widgets/options";
import type { ScreenSize } from "./map-board";

export const mapApp = (
  app: OldmarrApp,
  screenSize: ScreenSize,
  appsMap: Map<string, { id: string }>,
  sectionMap: Map<string, { id: string }>,
): InferInsertModel<typeof items> => {
  if (app.area.type === "sidebar") throw new Error("Mapping app in sidebar is not supported");

  const shapeForSize = app.shape[screenSize];
  if (!shapeForSize) {
    throw new Error(`Failed to find a shape for appId='${app.id}' screenSize='${screenSize}'`);
  }

  const sectionId = sectionMap.get(app.area.properties.id)?.id;
  if (!sectionId) {
    throw new Error(`Failed to find section for app appId='${app.id}' sectionId='${app.area.properties.id}'`);
  }

  return {
    id: createId(),
    sectionId,
    height: shapeForSize.size.height,
    width: shapeForSize.size.width,
    xOffset: shapeForSize.location.x,
    yOffset: shapeForSize.location.y,
    kind: "app",
    options: SuperJSON.stringify({
      // it's safe to assume that the app exists in the map
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
      appId: appsMap.get(app.id)?.id!,
      openInNewTab: app.behaviour.isOpeningNewTab,
      pingEnabled: app.network.enabledStatusChecker,
      showDescriptionTooltip: app.behaviour.tooltipDescription !== "",
      showTitle: app.appearance.appNameStatus === "normal",
    } satisfies WidgetComponentProps<"app">["options"]),
  };
};

export const mapWidget = (
  widget: OldmarrWidget,
  screenSize: ScreenSize,
  appsMap: Map<string, { id: string }>,
  sectionMap: Map<string, { id: string }>,
): InferInsertModel<typeof items> => {
  if (widget.area.type === "sidebar") throw new Error("Mapping widget in sidebar is not supported");

  const shapeForSize = widget.shape[screenSize];
  if (!shapeForSize) {
    throw new Error(`Failed to find a shape for widgetId='${widget.id}' screenSize='${screenSize}'`);
  }

  const kind = mapKind(widget.type);
  if (!kind) {
    throw new Error(`Failed to map widget kind widgetId='${widget.id}' kind='${kind}'`);
  }

  const sectionId = sectionMap.get(widget.area.properties.id)?.id;
  if (!sectionId) {
    throw new Error(
      `Failed to find section for widget widgetId='${widget.id}' sectionId='${widget.area.properties.id}'`,
    );
  }

  return {
    id: createId(),
    sectionId,
    height: shapeForSize.size.height,
    width: shapeForSize.size.width,
    xOffset: shapeForSize.location.x,
    yOffset: shapeForSize.location.y,
    kind,
    options: SuperJSON.stringify(mapOptions(kind, widget.properties, appsMap)),
  };
};
