import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { and, eq, notInArray } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import {
  customWidgetCreateSchema,
  customWidgetDefinitionSchema,
  customWidgetUpdateSchema,
} from "@homarr/custom-widgets/core";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";
import { managementQueryProcedures } from "./management-queries";
import { metadataProcedures } from "./metadata-procedures";
import { previewActionProcedures } from "./preview-action-procedures";
import { previewBaseProcedures } from "./preview-base-procedures";
import { previewQueryProcedures } from "./preview-query-procedures";
import {
  parseStoredCustomWidgetDefinition,
  safeParseStoredCustomWidgetDefinition,
  serializeCustomWidgetDefinition,
} from "./stored-definition";
import { templateProcedures } from "./template-procedures";
import { transferProcedures } from "./transfer-procedures";
import { assertSecretSources, requiredSecretKinds } from "./secret-policy";
import { secretProcedures } from "./secret-procedures";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");
const logger = createLogger({ module: "custom-widget" });

export const customWidgetRouter = createTRPCRouter({
  ...metadataProcedures,
  ...managementQueryProcedures,

  create: manageProcedure
    .meta({ mcp: { enabled: true, description: "Create one validated Custom JSX widget." } })
    .input(customWidgetCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const { secrets, ...candidate } = input;
      if (secrets.length > 0 && !ctx.session.user.permissions.includes("custom-widget-secret-write")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Writing custom widget secrets requires dedicated permission",
        });
      }
      const definition = customWidgetDefinitionSchema.parse(candidate);
      assertSecretSources(definition.sources, secrets);
      const id = createId();
      await ctx.db.insert(customWidgetDefinitions).values({
        id,
        ...serializeCustomWidgetDefinition(definition),
        creatorId: ctx.session.user.id,
      });
      if (secrets.length > 0) {
        await ctx.db.insert(customWidgetSecrets).values(
          secrets.map((secret) => ({
            definitionId: id,
            sourceId: secret.sourceId,
            kind: secret.kind,
            encryptedValue: encryptSecret(secret.value),
            updatedAt: new Date(),
          })),
        );
      }
      logger.info("Created custom widget definition", { id, name: definition.name });
      return { id };
    }),

  update: manageProcedure
    .meta({ mcp: { enabled: true, description: "Update one Custom JSX widget." } })
    .input(customWidgetUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const current = parseStoredCustomWidgetDefinition(existing);
      const { id, secrets, ...changes } = input;
      if (secrets?.length && !ctx.session.user.permissions.includes("custom-widget-secret-write")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Writing custom widget secrets requires dedicated permission",
        });
      }
      const definition = customWidgetDefinitionSchema.parse({ ...current, ...changes });
      if (secrets) assertSecretSources(definition.sources, secrets);

      await ctx.db
        .update(customWidgetDefinitions)
        .set({ ...serializeCustomWidgetDefinition(definition), updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, id));

      await ctx.db.delete(customWidgetSecrets).where(
        and(
          eq(customWidgetSecrets.definitionId, id),
          notInArray(
            customWidgetSecrets.sourceId,
            definition.sources.map((source) => source.id),
          ),
        ),
      );

      for (const source of definition.sources) {
        const kinds = [...requiredSecretKinds(source.auth.type)];
        const where = and(eq(customWidgetSecrets.definitionId, id), eq(customWidgetSecrets.sourceId, source.id));
        await ctx.db
          .delete(customWidgetSecrets)
          .where(kinds.length > 0 ? and(where, notInArray(customWidgetSecrets.kind, kinds)) : where);
      }

      if (secrets !== undefined) {
        for (const secret of secrets) {
          await ctx.db
            .delete(customWidgetSecrets)
            .where(
              and(
                eq(customWidgetSecrets.definitionId, id),
                eq(customWidgetSecrets.sourceId, secret.sourceId),
                eq(customWidgetSecrets.kind, secret.kind),
              ),
            );
          await ctx.db.insert(customWidgetSecrets).values({
            definitionId: id,
            sourceId: secret.sourceId,
            kind: secret.kind,
            encryptedValue: encryptSecret(secret.value),
            updatedAt: new Date(),
          });
        }
      }
      logger.info("Updated custom widget definition", { id });
    }),

  ...secretProcedures,

  toggleEnabled: manageProcedure
    .input(z.object({ id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (input.enabled) {
        const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
          where: eq(customWidgetDefinitions.id, input.id),
        });
        if (!definition) throw new TRPCError({ code: "NOT_FOUND" });
        if (!safeParseStoredCustomWidgetDefinition(definition).success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid custom widget definition cannot be enabled",
          });
        }
      }

      await ctx.db
        .update(customWidgetDefinitions)
        .set({ enabled: input.enabled, updatedAt: new Date() })
        .where(eq(customWidgetDefinitions.id, input.id));
    }),

  delete: manageProcedure
    .meta({ mcp: { enabled: true, description: "Delete one Custom JSX widget." } })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(customWidgetDefinitions).where(eq(customWidgetDefinitions.id, input.id));
      logger.info("Deleted custom widget definition", { id: input.id });
    }),

  duplicate: manageProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    const current = parseStoredCustomWidgetDefinition(existing);
    const id = createId();
    await ctx.db.insert(customWidgetDefinitions).values({
      id,
      ...serializeCustomWidgetDefinition({ ...current, name: `${current.name} (copy)` }),
      creatorId: ctx.session.user.id,
    });
    return { id, name: `${current.name} (copy)` };
  }),

  ...templateProcedures,
  ...transferProcedures,
  ...previewBaseProcedures,
  ...previewQueryProcedures,
  ...previewActionProcedures,
});
