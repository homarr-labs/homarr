import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { CUSTOM_WIDGET_MCP_AUTHORING_PROMPT } from "@homarr/custom-widgets/authoring-prompt";
import {
  CUSTOM_WIDGET_SKILL_REFERENCE_NAMES,
  findCustomWidgetComponents,
  getCustomWidgetComponent,
  getCustomWidgetComponentCatalog,
  getCustomWidgetComponents,
  getCustomWidgetExample,
  getCustomWidgetSharedProps,
  getCustomWidgetSkillEntrypoint,
  getCustomWidgetSkillReference,
} from "@homarr/custom-widgets/authoring-resources";
import {
  customWidgetAuthoringDefinitionSchema,
  getCustomWidgetJsonSchema,
  normalizeCustomJsxAuthoringTemplate,
  normalizeCustomWidgetAuthoringDefinition,
} from "@homarr/custom-widgets/core";
import { addCustomJsxDiagnosticSourceExcerpts, validateCustomJsxTemplate } from "@homarr/custom-widgets/jsx/analyzer";

import { permissionRequiredProcedure } from "../../trpc";

const customWidgetTemplateMaxLength = 50_000;
const customWidgetTemplateValidationInputSchema = z
  .strictObject({
    template: z.string().min(1).max(customWidgetTemplateMaxLength).optional(),
    templateLines: z.array(z.string().max(10_000)).min(1).max(2_000).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.template === undefined && input.templateLines === undefined) {
      ctx.addIssue({ code: "custom", message: "Provide template or templateLines" });
    }
    if (input.template !== undefined && input.templateLines !== undefined) {
      ctx.addIssue({ code: "custom", path: ["templateLines"], message: "Provide only one template format" });
    }
    const joinedLength = input.templateLines?.reduce((length, line) => length + line.length + 1, 0) ?? 0;
    if (joinedLength > customWidgetTemplateMaxLength) {
      ctx.addIssue({
        code: "custom",
        path: ["templateLines"],
        message: `The JSX template must contain at most ${customWidgetTemplateMaxLength} characters`,
      });
    }
  });

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
        "homarr://custom-widgets/references/{schema|runtime|security}",
      ],
      httpResources: [
        "/api/custom-widgets/schema",
        "/api/custom-widgets/components",
        "/api/custom-widgets/skill",
        "/api/custom-widgets/reference-{schema|runtime|security}",
      ],
    })),

  getSkill: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Load the compact Homarr Custom Widget authoring entrypoint and its reference index. Fetch only a named reference needed by the current design with customWidget_getReference.",
      },
    })
    .query(() => getCustomWidgetSkillEntrypoint()),

  getReference: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Load one named Custom Widget authoring reference. Use schema for manifest syntax, runtime for interactions, or security for authentication and interpreter constraints.",
      },
    })
    .input(z.object({ name: z.enum(CUSTOM_WIDGET_SKILL_REFERENCE_NAMES) }))
    .query(({ input }) => getCustomWidgetSkillReference(input.name)),

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

  findComponents: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Find a small release-matched Custom JSX component subset by name or capability. Prefer this over loading the complete catalog when the intended UI is already known.",
      },
    })
    .input(
      z.object({
        query: z.string().trim().min(2).max(240),
        limit: z
          .number()
          .int()
          .min(1)
          .max(16)
          .default(16)
          .describe("Maximum matches. Search again for a different capability when needed."),
      }),
    )
    .query(({ input }) => findCustomWidgetComponents(input.query, input.limit)),

  getComponent: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get one installed Custom JSX component document to resolve a concrete repair. Prefer customWidget_getComponents for a planned set.",
      },
    })
    .input(z.object({ name: z.string().trim().min(1).max(128).describe("A component name from the catalog.") }))
    .query(({ input }) => {
      const component = getCustomWidgetComponent(input.name);
      if (!component) throw new TRPCError({ code: "NOT_FOUND", message: "Custom JSX component not found" });
      return component;
    }),

  getComponents: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get compact installed documentation for up to eight selected Custom JSX components in one batch. Full single-component details remain available for a concrete unresolved prop or repair.",
      },
    })
    .input(
      z.object({
        names: z
          .array(z.string().trim().min(1).max(128))
          .min(1)
          .max(8)
          .describe("Selected component names from customWidget_findComponents."),
      }),
    )
    .query(({ input }) => getCustomWidgetComponents(input.names)),

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
      const { template, ...widget } = example.widget;
      return { ...example, widget: { ...widget, templateLines: template.split("\n") } };
    }),

  validateTemplate: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Validate only a Custom JSX template for parser, component, interpreter, and safety issues. Prefer templateLines and never pass both formats. Use this inexpensive check while drafting so the complete manifest is sent only once to preview creation.",
      },
    })
    .input(customWidgetTemplateValidationInputSchema)
    .query(({ input }) => {
      const rawTemplate = input.template ?? input.templateLines?.join("\n") ?? "";
      const template = normalizeCustomJsxAuthoringTemplate(rawTemplate);
      const diagnostics = addCustomJsxDiagnosticSourceExcerpts(template, validateCustomJsxTemplate(template));
      const valid = diagnostics.every((diagnostic) => diagnostic.severity !== "error");
      const hasUnknownProp = diagnostics.some((diagnostic) => diagnostic.message.startsWith("UNKNOWN_MANTINE_PROP"));
      let nextStep =
        "After the manifest and template agree, send the complete definition once to customWidget_previewCreate for full validation and a testable preview.";
      if (!valid) {
        nextStep = "Repair the reported JSX errors, then revalidate only the corrected template before previewing.";
      } else if (hasUnknownProp) {
        nextStep =
          "Repair unknown component props before previewing; they may be ignored by the installed release. Revalidate the corrected JSX only.";
      }
      return {
        valid,
        normalizedCharacters: rawTemplate.length - template.length,
        diagnostics,
        summary: {
          characters: template.length,
          lines: template.split("\n").length,
        },
        nextStep,
      };
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
