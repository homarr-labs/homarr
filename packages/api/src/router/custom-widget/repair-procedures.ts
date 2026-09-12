import { TRPCError } from "@trpc/server";
import { parse } from "superjson";
import { z } from "zod/v4";

import { isRecord } from "@homarr/common";
import { and, eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { hasSameSecretBinding, requiredSecretKinds } from "./secret-policy";
import { safeParseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";

const admin = permissionRequiredProcedure.requiresPermission("admin");

export const repairProcedures = {
  getRaw: admin.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const row = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
      with: { secrets: true },
    });
    if (!row) throw new TRPCError({ code: "NOT_FOUND" });
    const result = safeParseStoredCustomWidgetDefinition(row);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      iconUrl: row.iconUrl,
      sources: row.sources,
      requests: row.requests,
      options: row.options,
      template: row.template,
      enabled: row.enabled,
      issues: result.success ? [] : result.issues,
      secrets: row.secrets.map(({ sourceId, kind, updatedAt }) => ({ sourceId, kind, updatedAt, hasValue: true })),
    };
  }),
  repair: admin
    .input(z.object({ id: z.string(), widget: customWidgetDefinitionSchema }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.customWidgetDefinitions.findFirst({
        where: eq(customWidgetDefinitions.id, input.id),
        with: { secrets: true },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      let oldSources: Record<string, unknown> = {};
      try {
        const parsed: unknown = parse(row.sources);
        if (isRecord(parsed)) oldSources = parsed;
      } catch {
        /* Unreadable source bindings cannot safely retain credentials. */
      }
      const removedSources = new Set<string>();
      const removedSecrets = row.secrets.filter((secret) => {
        const next = input.widget.sources[secret.sourceId];
        const previous = customWidgetDefinitionSchema.shape.sources.safeParse({
          [secret.sourceId]: oldSources[secret.sourceId],
        });
        let oldSource;
        if (previous.success) oldSource = previous.data[secret.sourceId];
        if (!next || !oldSource || !hasSameSecretBinding(oldSource, next)) {
          removedSources.add(secret.sourceId);
          return true;
        }
        const type = typeof next.auth === "string" ? next.auth : next.auth.type;
        return !new Set<string>(requiredSecretKinds(type)).has(secret.kind);
      });
      const changes = { ...serializeCustomWidgetDefinition(input.widget), updatedAt: new Date() };
      await handleTransactionsAsync(ctx.db, {
        async handleAsync(database, schema) {
          await database.transaction(async (transaction) => {
            await transaction
              .update(schema.customWidgetDefinitions)
              .set(changes)
              .where(eq(schema.customWidgetDefinitions.id, input.id));
            for (const secret of removedSecrets)
              await transaction
                .delete(schema.customWidgetSecrets)
                .where(
                  and(
                    eq(schema.customWidgetSecrets.definitionId, input.id),
                    eq(schema.customWidgetSecrets.sourceId, secret.sourceId),
                    eq(schema.customWidgetSecrets.kind, secret.kind),
                  ),
                );
          });
        },
        handleSync(database) {
          database.transaction((transaction) => {
            transaction
              .update(customWidgetDefinitions)
              .set(changes)
              .where(eq(customWidgetDefinitions.id, input.id))
              .run();
            for (const secret of removedSecrets)
              transaction
                .delete(customWidgetSecrets)
                .where(
                  and(
                    eq(customWidgetSecrets.definitionId, input.id),
                    eq(customWidgetSecrets.sourceId, secret.sourceId),
                    eq(customWidgetSecrets.kind, secret.kind),
                  ),
                )
                .run();
          });
        },
      });
      return {
        id: input.id,
        managementPath: `/manage/custom-widgets/edit/${input.id}`,
        credentialsRequired: [...removedSources],
      };
    }),
};
