import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { customWidgetDefinitions } from "@homarr/db/schema";
import {
  customWidgetSecretInputSchema,
  customWidgetSecretsInputSchema,
  customWidgetSourceSchema,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";

import { customWidgetAdminProcedure } from "./feature-flags";
import {
  createCustomWidgetConfigurationRequest,
  getCustomWidgetConfigurationRequestForUser,
} from "./configuration-requests";
import { assertSecretSources, requiredSecretKinds } from "./secret-policy";
import { clearCustomWidgetSecret, configureCustomWidgetSource, setCustomWidgetSecret } from "./secret-persistence";
import { getPreviewSession } from "./preview-sessions";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";

const secretRequestInputSchema = z
  .object({
    requestId: z.string().optional(),
    definitionId: z.string().optional(),
    previewSessionId: z.string().optional(),
    sourceId: z.string().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.requestId) {
      if (input.definitionId || input.previewSessionId || input.sourceId) {
        ctx.addIssue({ code: "custom", message: "Status checks only accept requestId" });
      }
      return;
    }
    if (Boolean(input.definitionId) === Boolean(input.previewSessionId)) {
      ctx.addIssue({ code: "custom", message: "Provide exactly one definitionId or previewSessionId" });
    }
    if (!input.sourceId) ctx.addIssue({ code: "custom", message: "sourceId is required" });
  });

export const secretProcedures = {
  secretSet: customWidgetAdminProcedure
    .meta({ mcp: { enabled: true, description: "Set one encrypted secret for a custom widget source." } })
    .input(z.object({ definitionId: z.string(), secret: customWidgetSecretInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const definition = parseStoredCustomWidgetDefinition(existing);
      assertSecretSources(definition.sources, [input.secret]);
      await setCustomWidgetSecret(ctx.db, input.definitionId, input.secret);
      return { sourceId: input.secret.sourceId, kind: input.secret.kind, isSet: true };
    }),

  sourceConfigure: customWidgetAdminProcedure
    .meta({ mcp: { enabled: true, description: "Configure one custom widget API source and its credentials." } })
    .input(
      z.object({
        definitionId: z.string(),
        sourceId: z.string(),
        baseUrl: z.string(),
        networkScope: z.enum(["public", "private", "loopback"]).optional(),
        secrets: customWidgetSecretsInputSchema.default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const stored = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
      });
      if (!stored) throw new TRPCError({ code: "NOT_FOUND" });
      const definition = parseStoredCustomWidgetDefinition(stored);
      const current = definition.sources[input.sourceId];
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Widget source not found" });
      const source = customWidgetSourceSchema.parse({
        ...current,
        baseUrl: input.baseUrl,
        networkScope: input.networkScope ?? current.networkScope,
      });
      assertSecretSources({ [input.sourceId]: source }, input.secrets);
      const updated = { ...definition, sources: { ...definition.sources, [input.sourceId]: source } };
      await configureCustomWidgetSource(ctx.db, {
        definitionId: input.definitionId,
        sourceId: input.sourceId,
        definition: updated,
        previousSource: current,
        source,
        secrets: input.secrets,
      });
      return {
        definitionId: input.definitionId,
        sourceId: input.sourceId,
        baseUrl: source.baseUrl,
        networkScope: source.networkScope,
        configuredSecrets: input.secrets.map(({ kind }) => kind),
      };
    }),

  configurationRequestUser: customWidgetAdminProcedure
    .meta({ mcp: { enabled: true, description: "Create or check a short-lived user source-configuration request." } })
    .input(secretRequestInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.requestId) {
        const request = await getCustomWidgetConfigurationRequestForUser(input.requestId, ctx.session.user.id);
        if (!request) throw new TRPCError({ code: "NOT_FOUND" });
        return { requestId: request.id, status: request.status, expiresAt: request.expiresAt };
      }

      let widgetName: string;
      let source: { id: string; name: string; auth: string | { type: string }; value: CustomWidgetSource } | undefined;
      let target: { type: "definition"; id: string } | { type: "preview"; id: string };
      if (input.definitionId) {
        const stored = await ctx.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
        });
        if (!stored) throw new TRPCError({ code: "NOT_FOUND" });
        const definition = parseStoredCustomWidgetDefinition(stored);
        widgetName = definition.name;
        const candidate = definition.sources[input.sourceId ?? ""];
        source = candidate
          ? {
              id: input.sourceId ?? "",
              name: candidate.name ?? input.sourceId ?? "",
              auth: candidate.auth,
              value: candidate,
            }
          : undefined;
        target = { type: "definition", id: input.definitionId };
      } else {
        const preview = await getPreviewSession(input.previewSessionId ?? "", ctx.session.user.id);
        widgetName = preview.name;
        const candidate = preview.sources[input.sourceId ?? ""];
        source = candidate
          ? {
              id: input.sourceId ?? "",
              name: candidate.name ?? input.sourceId ?? "",
              auth: candidate.auth,
              value: candidate,
            }
          : undefined;
        target = { type: "preview", id: preview.id };
      }
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Widget source not found" });
      const kinds = [...requiredSecretKinds(typeof source.auth === "string" ? source.auth : source.auth.type)];
      const request = await createCustomWidgetConfigurationRequest({
        userId: ctx.session.user.id,
        target,
        widgetName,
        sourceId: source.id,
        sourceName: source.name,
        source: source.value,
        kinds,
      });
      return {
        requestId: request.id,
        status: request.status,
        expiresAt: request.expiresAt,
        url: new URL(`/custom-widget-configuration/${request.id}`, ctx.baseUrl ?? "http://localhost").toString(),
      };
    }),

  secretClear: customWidgetAdminProcedure
    .input(
      z.object({ definitionId: z.string(), sourceId: z.string(), kind: z.enum(["apiKey", "username", "password"]) }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await clearCustomWidgetSecret(ctx.db, input);
      return { sourceId: input.sourceId, kind: input.kind, isSet: false };
    }),
};
