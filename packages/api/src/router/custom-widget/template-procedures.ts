import { createHash } from "node:crypto";

import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import { and, eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";

import { permissionRequiredProcedure } from "../../trpc";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");
const logger = createLogger({ module: "custom-widget" });

const getTemplateRevision = (template: string) => createHash("sha256").update(template).digest("hex").slice(0, 16);

const validateTemplate = (definition: ReturnType<typeof parseStoredCustomWidgetDefinition>, template: string) => {
  if (template.trim().length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Template must not be empty" });
  }
  const result = customWidgetDefinitionSchema.safeParse({ ...definition, template });
  if (!result.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: result.error.issues
        .map((issue) => `${issue.path.map(String).join(".") || "template"}: ${issue.message}`)
        .join("; "),
    });
  }
  return result.data.template;
};

export const templateProcedures = {
  readTemplate: manageProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });
    if (!definition) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
    const template = parseStoredCustomWidgetDefinition(definition).template;
    return {
      id: definition.id,
      name: definition.name,
      template,
      templateLines: template.split("\n"),
      revision: getTemplateRevision(template),
    };
  }),

  writeTemplate: manageProcedure
    .input(
      z
        .object({ id: z.string(), template: z.string().optional(), templateLines: z.array(z.string()).optional() })
        .refine((data) => data.template !== undefined || data.templateLines !== undefined, {
          message: "Provide either template or templateLines",
        })
        .refine((data) => !(data.template !== undefined && data.templateLines !== undefined), {
          message: "Provide template or templateLines, not both",
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const resolved = input.templateLines?.join("\n") ?? input.template ?? "";
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      const template = validateTemplate(parseStoredCustomWidgetDefinition(existing), resolved);
      await ctx.db
        .update(customWidgetDefinitions)
        .set({ template, updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));
      logger.info("Updated custom widget template", { id: input.id });
      return { id: input.id, template, templateLines: template.split("\n"), revision: getTemplateRevision(template) };
    }),

  templatePatch: manageProcedure
    .meta({ mcp: { enabled: true, description: "Patch selected JSX template lines using an optimistic revision." } })
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
      const definition = parseStoredCustomWidgetDefinition(existing);
      if (getTemplateRevision(definition.template) !== input.expectedRevision) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Template changed since it was read. Read it again and retry.",
        });
      }

      const lines = definition.template.split("\n");
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

      const template = validateTemplate(definition, lines.join("\n"));
      const updateResult = (await ctx.db
        .update(customWidgetDefinitions)
        .set({ template, updatedAt: new Date() })
        .where(
          and(eq(customWidgetDefinitions.id, input.id), eq(customWidgetDefinitions.template, definition.template)),
        )) as unknown;
      if (getAffectedRowCount(updateResult) === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Template changed since it was read. Read it again and retry.",
        });
      }
      logger.info("Patched custom widget template", { id: input.id, editCount: input.edits.length });
      return { id: input.id, template, templateLines: lines, revision: getTemplateRevision(template) };
    }),
};

function getAffectedRowCount(result: unknown): number {
  if (Array.isArray(result)) return getAffectedRowCount(result[0]);
  if (!result || typeof result !== "object") return 0;
  if ("affectedRows" in result && typeof result.affectedRows === "number") return result.affectedRows;
  if ("rowCount" in result && typeof result.rowCount === "number") return result.rowCount;
  if ("changes" in result && typeof result.changes === "number") return result.changes;
  return 0;
}
