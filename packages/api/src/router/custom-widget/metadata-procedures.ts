import { z } from "zod/v4";

import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "@homarr/custom-widgets/authoring-prompt";
import { getCustomWidgetSkill } from "@homarr/custom-widgets/authoring-resources";
import { customWidgetImportSchema, getCustomWidgetJsonSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure, publicProcedure } from "../../trpc";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");
export const metadataProcedures = {
  schema: publicProcedure
    .meta({ mcp: { enabled: true, description: "Get the current Custom JSX widget JSON Schema." } })
    .query(() => getCustomWidgetJsonSchema()),

  getAuthoringPrompt: publicProcedure
    .meta({ mcp: { enabled: true, description: "Get the current Custom Widget authoring instructions." } })
    .query(() => ({
      version: 2,
      prompt: CUSTOM_WIDGET_MCP_AUTHORING_PROMPT,
      resources: [
        "homarr://custom-widgets/schema",
        "homarr://custom-widgets/components",
        "homarr://custom-widgets/skill",
      ],
    })),

  getSkill: publicProcedure
    .meta({ mcp: { enabled: true, description: "Get the portable Homarr Custom Widget skill." } })
    .query(() => getCustomWidgetSkill()),

  validate: manageProcedure
    .meta({ mcp: { enabled: true, description: "Validate one Custom JSX widget without saving it." } })
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
