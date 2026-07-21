import { z } from "zod/v4";

import { customWidgetImportSchema } from "./custom-jsx-schema";

export * from "./custom-jsx-schema";
export * from "./definition-schemas";
export * from "./schema-types";

let customWidgetJsonSchema: Record<string, unknown> | undefined;

export function getCustomWidgetJsonSchema() {
  customWidgetJsonSchema ??= {
    ...z.toJSONSchema(customWidgetImportSchema, { io: "input" }),
    title: "Homarr Custom JSX v2 widget",
    description: "The only supported Homarr custom-widget format. Secrets are configured separately.",
  };
  return customWidgetJsonSchema;
}
