import type { OldmarrConfig } from "@homarr/old-schema";

import type { ScreenSize } from "../mappers/map-board";
import { mapApp, mapWidget } from "../mappers/map-item";

export const prepareItems = (
  { apps, widgets }: Pick<OldmarrConfig, "apps" | "widgets">,
  screenSize: ScreenSize,
  appsMap: Map<string, { id: string }>,
  sectionMap: Map<string, { id: string }>,
) =>
  widgets
    .map((widget) => mapWidget(widget, screenSize, appsMap, sectionMap))
    .concat(apps.map((app) => mapApp(app, screenSize, appsMap, sectionMap)));
