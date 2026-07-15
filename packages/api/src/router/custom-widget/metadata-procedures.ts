import { z } from "zod/v4";

import { customWidgetImportSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure, publicProcedure } from "../../trpc";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");
let schemaCache: Record<string, unknown> | undefined;

function getImportJsonSchema() {
  schemaCache ??= {
    ...z.toJSONSchema(customWidgetImportSchema),
    title: "Homarr Custom Widget",
    description:
      "Schema for importing/exporting custom widget definitions in Homarr. All jsonPath fields use JSONPath syntax. The displayConfig must match displayType. Secrets are configured separately after import.",
  };
  return schemaCache;
}

export const metadataProcedures = {
  schema: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get the JSON Schema for Homarr custom-widget imports. Use this before generating a widget and before calling validate, create, or update.",
      },
    })
    .query(() => getImportJsonSchema()),

  validate: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Validate a complete custom-widget JSON draft without saving or making network requests. Returns structured issue paths so an agent can correct and validate again.",
      },
    })
    .input(z.object({ widget: z.unknown() }))
    .query(({ input }) => {
      const result = customWidgetImportSchema.safeParse(input.widget);
      if (!result.success) {
        return {
          valid: false as const,
          issues: result.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            code: issue.code,
            message: issue.message,
          })),
        };
      }
      return { valid: true as const, issues: [], widget: result.data };
    }),
};
