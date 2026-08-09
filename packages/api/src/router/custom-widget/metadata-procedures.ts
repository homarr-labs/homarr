import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "@homarr/custom-widgets/authoring-prompt";
import {
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetExample,
  getCustomWidgetSharedProps,
  getCustomWidgetSkill,
} from "@homarr/custom-widgets/authoring-resources";
import {
  customWidgetAuthoringDefinitionSchema,
  getCustomWidgetJsonSchema,
  normalizeCustomWidgetAuthoringDefinition,
} from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";

export const metadataProcedures = {
  schema: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ mcp: { enabled: true, description: "Get the current Custom JSX widget JSON Schema." } })
    .query(() => getCustomWidgetJsonSchema()),

  getAuthoringPrompt: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({ mcp: { enabled: true, description: "Get the current Custom Widget authoring instructions." } })
    .query(() => ({
      version: 2,
      prompt: CUSTOM_WIDGET_MCP_AUTHORING_PROMPT,
      resources: [
        "homarr://custom-widgets/schema",
        "homarr://custom-widgets/components",
        "homarr://custom-widgets/skill",
      ],
      httpResources: ["/api/custom-widgets/schema", "/api/custom-widgets/components", "/api/custom-widgets/skill"],
    })),

  getSkill: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Load the complete Homarr Custom Widget authoring skill in one response, including SKILL.md and every bundled reference. Call this before authoring, repairing, validating, previewing, or creating a custom widget.",
      },
    })
    .query(() => getCustomWidgetSkill()),

  getComponentCatalog: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "List a compact index of supported Custom JSX component names, categories, shared prop names, safety policies, and example IDs. Fetch only the named details needed for the widget.",
      },
    })
    .query(() => getCustomWidgetComponentCatalog()),

  getComponent: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get the installed Custom JSX documentation, allowed props, blocked props, and accessibility requirements for one named component.",
      },
    })
    .input(z.object({ name: z.string().trim().min(1).max(128).describe("A component name from the catalog.") }))
    .query(({ input }) => {
      const component = getCustomWidgetComponent(input.name);
      if (!component) throw new TRPCError({ code: "NOT_FOUND", message: "Custom JSX component not found" });
      return component;
    }),

  getSharedProps: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get documentation for only the named shared Custom JSX props. Collect the shared prop names needed by all selected components and fetch them together once.",
      },
    })
    .input(
      z.object({
        names: z
          .array(z.string().trim().min(1).max(128))
          .min(1)
          .max(64)
          .describe("Shared prop names from customWidget_getComponentCatalog.sharedProps.names."),
      }),
    )
    .query(({ input }) => getCustomWidgetSharedProps(input.names)),

  getExample: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get one installed Custom JSX example by its catalog ID. Fetch only an example relevant to the requested interaction pattern.",
      },
    })
    .input(z.object({ name: z.string().trim().min(1).max(128).describe("An example ID from the catalog.") }))
    .query(({ input }) => {
      const example = getCustomWidgetExample(input.name);
      if (!example) throw new TRPCError({ code: "NOT_FOUND", message: "Custom JSX example not found" });
      return example;
    }),

  validate: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Validate one complete Custom JSX widget without saving it. Multiline JSX may be supplied as templateLines; the result returns precise issue paths to repair before previewing.",
      },
    })
    .input(
      z.object({
        widget: z
          .unknown()
          .describe("A complete Homarr Custom Widget v2 definition using either template or templateLines."),
      }),
    )
    .query(({ input }) => {
      const authoringResult = customWidgetAuthoringDefinitionSchema.safeParse(input.widget);
      if (!authoringResult.success) {
        return {
          valid: false as const,
          issues: authoringResult.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            code: issue.code,
            message: issue.message,
          })),
        };
      }
      try {
        const widget = normalizeCustomWidgetAuthoringDefinition(authoringResult.data);
        return {
          valid: true as const,
          issues: [],
          summary: {
            name: widget.name,
            sourceIds: Object.keys(widget.sources),
            requestIds: Object.keys(widget.requests),
            optionIds: Object.keys(widget.options),
            templateLineCount: widget.template.split("\n").length,
          },
          nextStep:
            "Reuse the validated authoring definition with customWidget_previewCreate, then run every returned query.",
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            valid: false as const,
            issues: error.issues.map((issue) => ({
              path: issue.path.map(String).join("."),
              code: issue.code,
              message: issue.message,
            })),
          };
        }
        throw error;
      }
    }),
};
