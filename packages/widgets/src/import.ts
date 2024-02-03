import type { WidgetKind } from "@homarr/definitions";

export type WidgetImportRecord = {
  [K in WidgetKind]: unknown;
};
