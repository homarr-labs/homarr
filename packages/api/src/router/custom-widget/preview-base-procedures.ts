import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { decryptSecret } from "@homarr/common/server";
import {
  customWidgetDefinitionSchema,
  customWidgetSecretsInputSchema,
  getCustomWidgetConfirmation,
  getCustomWidgetDefaultOptions,
  validateCustomWidgetOptions,
} from "@homarr/custom-widgets/core";
import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";

import { permissionRequiredProcedure } from "../../trpc";
import { createPreviewSession, getPreviewSession } from "./preview-sessions";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");

const previewCreateInputSchema = z.object({
  definition: customWidgetDefinitionSchema,
  secrets: customWidgetSecretsInputSchema.default([]),
  definitionId: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

const previewCreateProcedure = manageProcedure
  .meta({ mcp: { enabled: true, description: "Create a short-lived preview session for one unsaved custom widget." } })
  .input(previewCreateInputSchema)
  .mutation(async ({ ctx, input }) => {
    if (input.secrets.length > 0 && !ctx.session.user.permissions.includes("custom-widget-secret-write")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Writing preview secrets requires dedicated permission" });
    }
    const options = input.options ?? getCustomWidgetDefaultOptions(input.definition.options);
    const optionIssues = validateCustomWidgetOptions(input.definition.options, options);
    if (optionIssues.length > 0) {
      const issue = optionIssues[0];
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: issue ? `${issue.path}: ${issue.message}` : "Preview options are invalid",
      });
    }

    const secrets = [...input.secrets];
    if (input.definitionId) {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
        with: { secrets: true },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Custom widget definition not found" });
      for (const secret of existing.secrets) {
        if (!secrets.some((candidate) => candidate.sourceId === secret.sourceId && candidate.kind === secret.kind)) {
          secrets.push({ sourceId: secret.sourceId, kind: secret.kind, value: decryptSecret(secret.encryptedValue) });
        }
      }
    }

    const invalid = secrets.find((secret) => {
      const source = input.definition.sources[secret.sourceId];
      const authType = typeof source?.auth === "string" ? source.auth : source?.auth.type;
      const kinds =
        authType === "basic"
          ? ["username", "password"]
          : source && authType && ["bearer", "apiKeyHeader", "apiKeyQuery"].includes(authType)
            ? ["apiKey"]
            : [];
      return !source || !kinds.includes(secret.kind);
    });
    if (invalid) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Unknown secret source '${invalid.sourceId}'` });
    }

    const previewSession = await createPreviewSession({
      userId: ctx.session.user.id,
      sources: input.definition.sources,
      requests: input.definition.requests,
      name: input.definition.name,
      template: input.definition.template,
      optionDefinitions: input.definition.options,
      options,
      secrets,
      definitionId: input.definitionId,
    });
    return {
      success: true as const,
      previewSession,
      previewUrl: new URL(
        `/manage/custom-widgets/preview/${previewSession.id}`,
        ctx.baseUrl ?? "http://localhost",
      ).toString(),
      definition: {
        template: input.definition.template,
        defaultOptions: getCustomWidgetDefaultOptions(input.definition.options),
      },
    };
  });

export const previewBaseProcedures = {
  previewCreate: previewCreateProcedure,
  previewGet: manageProcedure.input(z.object({ sessionId: z.string() })).query(async ({ ctx, input }) => {
    const session = await getPreviewSession(input.sessionId, ctx.session.user.id);
    return {
      id: session.id,
      name: session.name,
      expiresAt: session.expiresAt,
      template: session.template,
      optionDefinitions: session.optionDefinitions,
      options: session.options,
      requests: Object.entries(session.requests).map(([id, request]) => ({
        id,
        kind: request.kind,
        method: request.method,
        minimumBoardPermission: request.permission,
        trigger: request.trigger,
        confirmation: getCustomWidgetConfirmation(request),
        invalidates: request.invalidates,
      })),
      liveActions: session.liveActions,
    };
  }),
};
