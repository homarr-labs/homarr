import { createHash } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { stringify as stringifySuperJson } from "superjson";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { displayConfigSchema } from "@homarr/custom-widgets/core";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";

import { permissionRequiredProcedure } from "../../trpc";
import { parseDisplayConfig } from "./parse-display-config";

const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

const logger = createLogger({ module: "custom-widget" });

const getTemplateRevision = (template: string) => createHash("sha256").update(template).digest("hex").slice(0, 16);

const validateUpdatedTemplate = (displayConfig: Record<string, unknown>, template: string) => {
  displayConfig.template = template;
  const result = displayConfigSchema.safeParse(displayConfig);
  if (!result.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: result.error.issues
        .map((issue) => `${issue.path.map(String).join(".") || "template"}: ${issue.message}`)
        .join("; "),
    });
  }
  return result.data;
};

export const templateProcedures = {
  readTemplate: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read the JSX template of a custom widget definition as plain text. Returns the template string separately from the full widget config, making it easier to inspect and edit.",
      },
    })
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!definition) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      }

      const config = parseDisplayConfig(
        definition.displayConfig,
        input.id,
        logger,
        "Corrupt displayConfig in custom widget readTemplate",
      );

      if (config.type !== "customJsx") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Widget is not using customJsx display type",
        });
      }

      const template = (config.template as string | undefined) ?? "";
      return {
        id: definition.id,
        name: definition.name,
        template,
        templateLines: template.split("\n"),
        revision: getTemplateRevision(template),
      };
    }),

  writeTemplate: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Update only the JSX template of a custom widget definition. Accepts either a single template string or templateLines (array of strings joined with newlines). Validates the template AST before saving. This avoids needing to send the full widget JSON for template-only edits.",
      },
    })
    .input(
      z
        .object({
          id: z.string(),
          template: z.string().optional(),
          templateLines: z.array(z.string()).optional(),
        })
        .refine((data) => data.template !== undefined || data.templateLines !== undefined, {
          message: "Provide either template or templateLines",
        })
        .refine((data) => !(data.template !== undefined && data.templateLines !== undefined), {
          message: "Provide template or templateLines, not both",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const resolvedTemplate =
        input.templateLines !== undefined ? input.templateLines.join("\n") : (input.template ?? "");

      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      }

      const displayConfig = parseDisplayConfig(
        existing.displayConfig,
        input.id,
        logger,
        "Corrupt displayConfig in custom widget writeTemplate",
      );

      if (displayConfig.type !== "customJsx") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Widget is not using customJsx display type",
        });
      }

      if (resolvedTemplate.trim().length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Template must not be empty" });
      }
      if (resolvedTemplate.length > 50_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Template exceeds the 50,000 character limit" });
      }

      const validatedConfig = validateUpdatedTemplate(displayConfig, resolvedTemplate);

      await ctx.db
        .update(customWidgetDefinitions)
        .set({ displayConfig: stringifySuperJson(validatedConfig), updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));

      logger.info("Updated custom widget template", { id: input.id });
      return {
        id: input.id,
        template: resolvedTemplate,
        templateLines: resolvedTemplate.split("\n"),
        revision: getTemplateRevision(resolvedTemplate),
      };
    }),

  patchTemplate: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Patch selected lines of a Custom JSX template without rewriting the whole template. First call customWidget_readTemplate and pass its revision as expectedRevision. Each edit uses a 1-based startLine, deleteCount, and replacementLines. Edits are applied atomically, then the complete template and named-request references are validated before saving. A stale revision is rejected so the agent can re-read and retry safely.",
      },
    })
    .input(
      z.object({
        id: z.string(),
        expectedRevision: z.string().length(16),
        edits: z
          .array(
            z.object({
              startLine: z.number().int().min(1),
              deleteCount: z.number().int().min(0),
              replacementLines: z.array(z.string()),
            }),
          )
          .min(1)
          .max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });

      const displayConfig = parseDisplayConfig(
        existing.displayConfig,
        input.id,
        logger,
        "Corrupt displayConfig in custom widget patchTemplate",
      );
      if (displayConfig.type !== "customJsx") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Widget is not using customJsx display type" });
      }

      const currentTemplate = (displayConfig.template as string | undefined) ?? "";
      if (getTemplateRevision(currentTemplate) !== input.expectedRevision) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Template changed since it was read. Read the template again and retry the patch.",
        });
      }

      const lines = currentTemplate.split("\n");
      const edits = input.edits.toSorted((left, right) => right.startLine - left.startLine);
      let nextHigherStart = lines.length + 2;
      for (const edit of edits) {
        if (edit.startLine > lines.length + 1 || edit.startLine + edit.deleteCount - 1 > lines.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Edit at line ${edit.startLine} is out of range` });
        }
        if (edit.startLine + Math.max(edit.deleteCount, 1) > nextHigherStart) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Template patch edits must not overlap" });
        }
        nextHigherStart = edit.startLine;
        lines.splice(edit.startLine - 1, edit.deleteCount, ...edit.replacementLines);
      }

      const template = lines.join("\n");
      const validatedConfig = validateUpdatedTemplate(displayConfig, template);
      await ctx.db
        .update(customWidgetDefinitions)
        .set({ displayConfig: stringifySuperJson(validatedConfig), updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));

      logger.info("Patched custom widget template", { id: input.id, editCount: input.edits.length });
      return {
        id: input.id,
        template,
        templateLines: lines,
        revision: getTemplateRevision(template),
      };
    }),
};
