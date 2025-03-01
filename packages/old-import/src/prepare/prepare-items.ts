import type { BoardSize, OldmarrConfig } from "@homarr/old-schema";

import { mapApp, mapWidget } from "../mappers/map-item";

export const prepareItems = (
  { apps, widgets }: Pick<OldmarrConfig, "apps" | "widgets">,
  appsMap: Map<string, { id: string }>,
  sectionMap: Map<string, { id: string }>,
  layoutMap: Record<BoardSize, string>,
  boardId: string,
) =>
  widgets
    .map((widget) => mapWidget(widget, appsMap, sectionMap, layoutMap, boardId))
    .concat(apps.map((app) => mapApp(app, appsMap, sectionMap, layoutMap, boardId)))
    .filter((widget) => widget !== null);
