import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { and, eq, handleTransactionsAsync, notInArray } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import {
  customWidgetCreateSchema,
  customWidgetDefinitionSchema,
  customWidgetUpdateSchema,
} from "@homarr/custom-widgets/core";

import { createTRPCRouter, permissionRequiredProcedure } from "../../trpc";
import { insertCustomWidgetDefinition } from "./definition-insert";
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
import { assertSecretSources, hasSameSecretBinding, requiredSecretKinds } from "./secret-policy";
import { secretProcedures } from "./secret-procedures";
import { workshopProcedures } from "./workshop-procedures";

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
      const id = await insertCustomWidgetDefinition(ctx.db, definition, ctx.session.user.id, secrets);
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
      const definitionChanges = { ...serializeCustomWidgetDefinition(definition), updatedAt: new Date() };
      const secretRows = secrets?.map((secret) => ({
        definitionId: id,
        sourceId: secret.sourceId,
        kind: secret.kind,
        encryptedValue: encryptSecret(secret.value),
        updatedAt: new Date(),
      }));
      const sourceIds = Object.keys(definition.sources);
      const changedSecretBindings = new Set(
        Object.entries(definition.sources).flatMap(([sourceId, source]) => {
          const previous = current.sources[sourceId];
          return previous && !hasSameSecretBinding(previous, source) ? [sourceId] : [];
        }),
      );

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction
              .update(schema.customWidgetDefinitions)
              .set(definitionChanges)
              .where(eq(schema.customWidgetDefinitions.id, id));

            await transaction
              .delete(schema.customWidgetSecrets)
              .where(
                and(
                  eq(schema.customWidgetSecrets.definitionId, id),
                  notInArray(schema.customWidgetSecrets.sourceId, sourceIds),
                ),
              );

            for (const sourceId of changedSecretBindings) {
              await transaction
                .delete(schema.customWidgetSecrets)
                .where(
                  and(
                    eq(schema.customWidgetSecrets.definitionId, id),
                    eq(schema.customWidgetSecrets.sourceId, sourceId),
                  ),
                );
            }

            for (const [sourceId, source] of Object.entries(definition.sources)) {
              const kinds = [...requiredSecretKinds(typeof source.auth === "string" ? source.auth : source.auth.type)];
              const where = and(
                eq(schema.customWidgetSecrets.definitionId, id),
                eq(schema.customWidgetSecrets.sourceId, sourceId),
              );
              await transaction
                .delete(schema.customWidgetSecrets)
                .where(kinds.length > 0 ? and(where, notInArray(schema.customWidgetSecrets.kind, kinds)) : where);
            }

            for (const secret of secretRows ?? []) {
              await transaction
                .delete(schema.customWidgetSecrets)
                .where(
                  and(
                    eq(schema.customWidgetSecrets.definitionId, id),
                    eq(schema.customWidgetSecrets.sourceId, secret.sourceId),
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
              .where(eq(customWidgetDefinitions.id, id))
              .run();

            transaction
              .delete(customWidgetSecrets)
              .where(and(eq(customWidgetSecrets.definitionId, id), notInArray(customWidgetSecrets.sourceId, sourceIds)))
              .run();

            for (const sourceId of changedSecretBindings) {
              transaction
                .delete(customWidgetSecrets)
                .where(and(eq(customWidgetSecrets.definitionId, id), eq(customWidgetSecrets.sourceId, sourceId)))
                .run();
            }

            for (const [sourceId, source] of Object.entries(definition.sources)) {
              const kinds = [...requiredSecretKinds(typeof source.auth === "string" ? source.auth : source.auth.type)];
              const where = and(eq(customWidgetSecrets.definitionId, id), eq(customWidgetSecrets.sourceId, sourceId));
              transaction
                .delete(customWidgetSecrets)
                .where(kinds.length > 0 ? and(where, notInArray(customWidgetSecrets.kind, kinds)) : where)
                .run();
            }

            for (const secret of secretRows ?? []) {
              transaction
                .delete(customWidgetSecrets)
                .where(
                  and(
                    eq(customWidgetSecrets.definitionId, id),
                    eq(customWidgetSecrets.sourceId, secret.sourceId),
                    eq(customWidgetSecrets.kind, secret.kind),
                  ),
                )
                .run();
              transaction.insert(customWidgetSecrets).values(secret).run();
            }
          });
        },
      });
      logger.info("Updated custom widget definition", { id });
    }),

  ...secretProcedures,
  ...workshopProcedures,

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
