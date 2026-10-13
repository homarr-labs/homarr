import { z } from "zod/v4";

import type { WidgetKind } from "@homarr/definitions";

/** Server settings that widget option defaults depend on. */
export interface WidgetOptionsSchemaSettings {
  enableStatusByDefault: boolean;
}

type WidgetOptionsSchemaCreator = (settings: WidgetOptionsSchemaSettings) => z.ZodObject;

const createAppWidgetOptionsSchema = (settings: WidgetOptionsSchemaSettings) =>
  z.object({
    appId: z.string().default(""),
    openInNewTab: z.boolean().default(true),
    showTitle: z.boolean().default(true),
    descriptionDisplayMode: z.enum(["normal", "tooltip", "hidden"]).default("hidden"),
    layout: z.enum(["column", "column-reverse", "row", "row-reverse"]).default("column"),
    pingEnabled: z.boolean().default(settings.enableStatusByDefault),
  });

/**
 * Lightweight copies of widget option definitions for the API trust boundary, kept aligned with the widget
 * definitions by the widget manifest tests. Options of other kinds, including Custom Widgets, are stored as submitted.
 */
export const widgetOptionsSchemas: Partial<Record<WidgetKind, WidgetOptionsSchemaCreator>> = {
  app: createAppWidgetOptionsSchema,
};
