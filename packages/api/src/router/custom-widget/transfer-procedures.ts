import { TRPCError } from "@trpc/server";
import { parse as parseSuperJson } from "superjson";
import { z } from "zod/v4";

import { encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets, legacyCustomWidgetDefinitions } from "@homarr/db/schema";
import { customWidgetImportSchema, customWidgetSecretsInputSchema } from "@homarr/custom-widgets/core";

import { insertCustomWidgetDefinition } from "./definition-insert";
import { permissionRequiredProcedure } from "../../trpc";
import { assertSecretSources, requiredSecretKinds } from "./secret-policy";
import { parseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";

const logger = createLogger({ module: "custom-widget" });

export const transferProcedures = {
  export: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const definition = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
      });
      if (!definition) throw new TRPCError({ code: "NOT_FOUND" });
      return parseStoredCustomWidgetDefinition(definition);
    }),

  exportLegacy: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const definition = await ctx.db.query.legacyCustomWidgetDefinitions.findFirst({
        where: eq(legacyCustomWidgetDefinitions.id, input.id),
        with: { secrets: true },
      });
      if (!definition) throw new TRPCError({ code: "NOT_FOUND", message: "Legacy custom widget not found" });

      return {
        $schema: "homarr-custom-widget-v1" as const,
        name: definition.name,
        description: definition.description,
        iconUrl: definition.iconUrl,
        url: definition.url,
        authType: definition.authType,
        headerName: definition.headerName,
        method: definition.method,
        requestBody: definition.requestBody,
        displayType: definition.displayType,
        displayConfig: parseLegacyDisplayConfig(definition.displayConfig),
        configuredSecretKinds: definition.secrets.map(({ kind }) => kind),
      };
    }),

  import: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ widget: customWidgetImportSchema, secrets: customWidgetSecretsInputSchema.default([]) }))
    .mutation(async ({ ctx, input }) => {
      assertSecretSources(input.widget.sources, input.secrets);
      const id = await insertCustomWidgetDefinition(ctx.db, input.widget, ctx.session.user.id, input.secrets);
      logger.info("Imported custom widget definition", { id, name: input.widget.name });
      return { id };
    }),

  migrateLegacy: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Replace one preserved legacy Custom Widget with a validated v2 definition while retaining compatible encrypted credentials.",
      },
    })
    .input(
      z.object({
        id: z.string(),
        widget: customWidgetImportSchema,
        secrets: customWidgetSecretsInputSchema.default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
          });
        },
        handleSync(database) {
          database.transaction((transaction) => {
            transaction.insert(customWidgetDefinitions).values(definitionRow).run();
            if (secretRows.length > 0) transaction.insert(customWidgetSecrets).values(secretRows).run();
          });
        },
      });
      logger.info("Created v2 replacement for preserved legacy custom widget definition", {
        id: legacy.id,
        preservedSecretCount: preservedSecrets.length,
      });
      return { id: legacy.id, preservedSecretCount: preservedSecrets.length };
    }),
};

function parseLegacyDisplayConfig(value: string): unknown {
  try {
    return parseSuperJson(value);
  } catch {
    return value;
  }
}

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
