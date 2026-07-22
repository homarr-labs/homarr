import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets, legacyCustomWidgetDefinitions } from "@homarr/db/schema";
import { customWidgetImportSchema, customWidgetSecretsInputSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { insertCustomWidgetDefinition } from "./definition-insert";
import { assertSecretSources, requiredSecretKinds } from "./secret-policy";
import { parseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";

const manageProcedure = permissionRequiredProcedure.requiresPermission("custom-widget-manage");
const logger = createLogger({ module: "custom-widget" });

export const transferProcedures = {
  export: manageProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });
    if (!definition) throw new TRPCError({ code: "NOT_FOUND" });
    return parseStoredCustomWidgetDefinition(definition);
  }),

  import: manageProcedure
    .input(z.object({ widget: customWidgetImportSchema, secrets: customWidgetSecretsInputSchema.default([]) }))
    .mutation(async ({ ctx, input }) => {
      if (input.secrets.length > 0 && !ctx.session.user.permissions.includes("custom-widget-secret-write")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Writing imported widget secrets requires dedicated permission",
        });
      }
      assertSecretSources(input.widget.sources, input.secrets);
      const id = await insertCustomWidgetDefinition(ctx.db, input.widget, ctx.session.user.id, input.secrets);
      logger.info("Imported custom widget definition", { id, name: input.widget.name });
      return { id };
    }),

  migrateLegacy: manageProcedure
    .input(
      z.object({
        id: z.string(),
        widget: customWidgetImportSchema,
        secrets: customWidgetSecretsInputSchema.default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.secrets.length > 0 && !ctx.session.user.permissions.includes("custom-widget-secret-write")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Writing migrated widget secrets requires dedicated permission",
        });
      }
      assertSecretSources(input.widget.sources, input.secrets);
      const [legacy, current] = await Promise.all([
        ctx.db.query.legacyCustomWidgetDefinitions.findFirst({
          where: eq(legacyCustomWidgetDefinitions.id, input.id),
          with: { secrets: true },
        }),
        ctx.db.query.customWidgetDefinitions.findFirst({ where: eq(customWidgetDefinitions.id, input.id) }),
      ]);
      if (!legacy) throw new TRPCError({ code: "NOT_FOUND", message: "Legacy custom widget not found" });
      if (current) throw new TRPCError({ code: "CONFLICT", message: "A v2 widget already uses this identifier" });

      const explicitKeys = new Set(input.secrets.map(({ sourceId, kind }) => `${sourceId}:${kind}`));
      const preservableKinds = new Set<string>(requiredSecretKinds(getAuthType(input.widget.sources.default?.auth)));
      const preservedSecrets = canPreserveLegacySecrets(legacy, input.widget)
        ? legacy.secrets.filter(({ kind }) => preservableKinds.has(kind) && !explicitKeys.has(`default:${kind}`))
        : [];
      const now = new Date();
      const definitionRow = {
        id: legacy.id,
        ...serializeCustomWidgetDefinition(input.widget),
        enabled: legacy.enabled,
        createdAt: legacy.createdAt,
        updatedAt: now,
        creatorId: legacy.creatorId,
      };
      const secretRows = [
        ...preservedSecrets.map(({ kind, encryptedValue }) => ({
          definitionId: legacy.id,
          sourceId: "default",
          kind,
          encryptedValue,
          updatedAt: now,
        })),
        ...input.secrets.map(({ sourceId, kind, value }) => ({
          definitionId: legacy.id,
          sourceId,
          kind,
          encryptedValue: encryptSecret(value),
          updatedAt: now,
        })),
      ];

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(database, schema) {
          await database.transaction(async (transaction) => {
            await transaction.insert(schema.customWidgetDefinitions).values(definitionRow);
            if (secretRows.length > 0) await transaction.insert(schema.customWidgetSecrets).values(secretRows);
            await transaction
              .delete(schema.legacyCustomWidgetDefinitions)
              .where(eq(schema.legacyCustomWidgetDefinitions.id, legacy.id));
          });
        },
        handleSync(database) {
          database.transaction((transaction) => {
            transaction.insert(customWidgetDefinitions).values(definitionRow).run();
            if (secretRows.length > 0) transaction.insert(customWidgetSecrets).values(secretRows).run();
            transaction
              .delete(legacyCustomWidgetDefinitions)
              .where(eq(legacyCustomWidgetDefinitions.id, legacy.id))
              .run();
          });
        },
      });
      logger.info("Migrated legacy custom widget definition", {
        id: legacy.id,
        preservedSecretCount: preservedSecrets.length,
      });
      return { id: legacy.id, preservedSecretCount: preservedSecrets.length };
    }),

  deleteLegacy: manageProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(legacyCustomWidgetDefinitions).where(eq(legacyCustomWidgetDefinitions.id, input.id));
    logger.info("Deleted legacy custom widget definition", { id: input.id });
  }),
};

function canPreserveLegacySecrets(
  legacy: typeof legacyCustomWidgetDefinitions.$inferSelect,
  widget: z.infer<typeof customWidgetImportSchema>,
) {
  const source = widget.sources.default;
  if (!source || getAuthType(source.auth) !== legacy.authType) return false;
  if (getOrigin(source.baseUrl) !== getOrigin(legacy.url)) return false;
  const headerName = typeof source.auth === "object" && "name" in source.auth ? source.auth.name : undefined;
  return headerName === (legacy.headerName ?? undefined);
}

function getAuthType(auth: string | { type: string } | undefined) {
  return typeof auth === "string" ? auth : (auth?.type ?? "none");
}

function getOrigin(value: string) {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}
