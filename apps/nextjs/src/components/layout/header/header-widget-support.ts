import type { WidgetKind } from "@homarr/definitions";

export const isBoardOnlyHeaderWidget = (kind: WidgetKind) =>
  kind === "customApi" || kind === "timetable" || kind === "releases";
