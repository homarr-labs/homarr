import type { BoardSize, OldmarrConfig } from "@homarr/old-schema";

import { mapApp, mapWidget } from "../mappers/map-item";

export const prepareItems = (
  { apps, widgets }: Pick<OldmarrConfig, "apps" | "widgets">,
  boardSize: BoardSize,
  appsMap: Map<string, { id: string }>,
  sectionMap: Map<string, { id: string }>,
) =>
  widgets
    .map((widget) => mapWidget(widget, boardSize, appsMap, sectionMap))
    .concat(apps.map((app) => mapApp(app, boardSize, appsMap, sectionMap)))
    .filter((widget) => widget !== null);
