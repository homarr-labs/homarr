import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { encryptSecret } from "@homarr/common/server";
import { and, eq } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import { customWidgetSecretInputSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { createCustomWidgetSecretRequest, getCustomWidgetSecretRequestForUser } from "./secret-requests";
import { assertSecretSources, requiredSecretKinds } from "./secret-policy";
import { getPreviewSession } from "./preview-sessions";
import { parseStoredCustomWidgetDefinition } from "./stored-definition";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");
const secretWriteProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-secret-write");

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
  secretSet: secretWriteProcedure
    .meta({ mcp: { enabled: true, description: "Set one encrypted secret for a custom widget source." } })
    .input(z.object({ definitionId: z.string(), secret: customWidgetSecretInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const definition = parseStoredCustomWidgetDefinition(existing);
      assertSecretSources(definition.sources, [input.secret]);
      await ctx.db
        .delete(customWidgetSecrets)
        .where(
          and(
            eq(customWidgetSecrets.definitionId, input.definitionId),
            eq(customWidgetSecrets.sourceId, input.secret.sourceId),
            eq(customWidgetSecrets.kind, input.secret.kind),
          ),
        );
      await ctx.db.insert(customWidgetSecrets).values({
        definitionId: input.definitionId,
        sourceId: input.secret.sourceId,
        kind: input.secret.kind,
        encryptedValue: encryptSecret(input.secret.value),
        updatedAt: new Date(),
      });
      await ctx.db
        .update(customWidgetDefinitions)
        .set({ updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.definitionId));
      return { sourceId: input.secret.sourceId, kind: input.secret.kind, isSet: true };
    }),

  secretRequestUser: manageProcedure
    .meta({ mcp: { enabled: true, description: "Create or check a short-lived user credential-entry request." } })
    .input(secretRequestInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (input.requestId) {
        const request = await getCustomWidgetSecretRequestForUser(input.requestId, ctx.session.user.id);
        if (!request) throw new TRPCError({ code: "NOT_FOUND" });
        return { requestId: request.id, status: request.status, expiresAt: request.expiresAt };
      }

      let widgetName: string;
      let source: { id: string; name: string; auth: { type: string } } | undefined;
      let target: { type: "definition"; id: string } | { type: "preview"; id: string };
      if (input.definitionId) {
        const stored = await ctx.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.definitionId),
        });
        if (!stored) throw new TRPCError({ code: "NOT_FOUND" });
        const definition = parseStoredCustomWidgetDefinition(stored);
        widgetName = definition.name;
        source = definition.sources.find((candidate) => candidate.id === input.sourceId);
        target = { type: "definition", id: input.definitionId };
      } else {
        const preview = await getPreviewSession(input.previewSessionId ?? "", ctx.session.user.id);
        widgetName = "Custom widget preview";
        source = preview.sources.find((candidate) => candidate.id === input.sourceId);
        target = { type: "preview", id: preview.id };
      }
      if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Widget source not found" });
      const kinds = [...requiredSecretKinds(source.auth.type)];
      if (kinds.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This source does not require a secret" });
      }
      const request = await createCustomWidgetSecretRequest({
        userId: ctx.session.user.id,
        target,
        widgetName,
        sourceId: source.id,
        sourceName: source.name,
        kinds,
      });
      return {
        requestId: request.id,
        status: request.status,
        expiresAt: request.expiresAt,
        url: new URL(`/custom-widget-secret/${request.id}`, ctx.baseUrl ?? "http://localhost").toString(),
      };
    }),

  secretClear: secretWriteProcedure
    .input(
      z.object({ definitionId: z.string(), sourceId: z.string(), kind: z.enum(["apiKey", "username", "password"]) }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.definitionId),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .delete(customWidgetSecrets)
        .where(
          and(
            eq(customWidgetSecrets.definitionId, input.definitionId),
            eq(customWidgetSecrets.sourceId, input.sourceId),
            eq(customWidgetSecrets.kind, input.kind),
          ),
        );
      await ctx.db
        .update(customWidgetDefinitions)
        .set({ updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.definitionId));
      return { sourceId: input.sourceId, kind: input.kind, isSet: false };
    }),
};
