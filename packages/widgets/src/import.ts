import type { WidgetSort } from ".";

export type WidgetImportRecord = {
  [K in WidgetSort]: unknown; // TODO: Restrict
};
