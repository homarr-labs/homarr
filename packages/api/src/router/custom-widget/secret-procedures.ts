import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { encryptSecret } from "@homarr/common/server";
import { and, eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import {
  customWidgetSecretInputSchema,
  customWidgetSecretsInputSchema,
  customWidgetSourceSchema,
} from "@homarr/custom-widgets/core";
import type { CustomWidgetSource } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import {
  createCustomWidgetConfigurationRequest,
  getCustomWidgetConfigurationRequestForUser,
} from "./configuration-requests";
import { assertSecretSources, hasSameSecretBinding, requiredSecretKinds } from "./secret-policy";
import { getPreviewSession } from "./preview-sessions";
import { parseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";

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

  sourceConfigure: manageProcedure
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
      if (input.secrets.length > 0 && !ctx.session.user.permissions.includes("custom-widget-secret-write")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Writing source credentials requires dedicated permission" });
      }
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
      const definitionChanges = { ...serializeCustomWidgetDefinition(updated), updatedAt: new Date() };
      const bindingChanged = !hasSameSecretBinding(current, source);
      const secretRows = input.secrets.map((secret) => ({
        definitionId: input.definitionId,
        sourceId: input.sourceId,
        kind: secret.kind,
        encryptedValue: encryptSecret(secret.value),
        updatedAt: new Date(),
      }));
      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction
              .update(schema.customWidgetDefinitions)
              .set(definitionChanges)
              .where(eq(schema.customWidgetDefinitions.id, input.definitionId));
            if (bindingChanged) {
              await transaction
                .delete(schema.customWidgetSecrets)
                .where(
                  and(
                    eq(schema.customWidgetSecrets.definitionId, input.definitionId),
                    eq(schema.customWidgetSecrets.sourceId, input.sourceId),
                  ),
                );
            }
            for (const secret of secretRows) {
              await transaction
                .delete(schema.customWidgetSecrets)
                .where(
                  and(
                    eq(schema.customWidgetSecrets.definitionId, input.definitionId),
                    eq(schema.customWidgetSecrets.sourceId, input.sourceId),
                    eq(schema.customWidgetSecrets.kind, secret.kind),
                  ),
                );
              await transaction.insert(schema.customWidgetSecrets).values(secret);
            }
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction
              .update(customWidgetDefinitions)
              .set(definitionChanges)
              .where(eq(customWidgetDefinitions.id, input.definitionId))
              .run();
            if (bindingChanged) {
              transaction
                .delete(customWidgetSecrets)
                .where(
                  and(
                    eq(customWidgetSecrets.definitionId, input.definitionId),
                    eq(customWidgetSecrets.sourceId, input.sourceId),
                  ),
                )
                .run();
            }
            for (const secret of secretRows) {
              transaction
                .delete(customWidgetSecrets)
                .where(
                  and(
                    eq(customWidgetSecrets.definitionId, input.definitionId),
                    eq(customWidgetSecrets.sourceId, input.sourceId),
                    eq(customWidgetSecrets.kind, secret.kind),
                  ),
                )
                .run();
              transaction.insert(customWidgetSecrets).values(secret).run();
            }
          });
        },
      });
      return {
        definitionId: input.definitionId,
        sourceId: input.sourceId,
        baseUrl: source.baseUrl,
        networkScope: source.networkScope,
        configuredSecrets: input.secrets.map(({ kind }) => kind),
      };
    }),

  configurationRequestUser: manageProcedure
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
        if (!ctx.session.user.permissions.includes("custom-widget-secret-write")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Creating a stored credential setup link requires dedicated permission",
          });
        }
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
