import { TRPCError } from "@trpc/server";

import { encryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { and, eq, handleTransactionsAsync, notInArray } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import {
  customWidgetDefinitionSchema,
  customWidgetUpdateSchema,
  normalizeCustomWidgetAuthoringUpdate,
} from "@homarr/custom-widgets/core";

import { permissionRequiredProcedure } from "../../trpc";
import { parseCustomWidgetAuthoringInput } from "./authoring-validation";
import { parseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";
import {
  assertCustomWidgetDefinitionChanged,
  customWidgetDefinitionMatch,
  customWidgetSavedRevision,
} from "./stored-definition-state";
import { assertSecretSources, hasSameSecretBinding, requiredSecretKinds } from "./secret-policy";
import { prepareSourceSecretRenames } from "./source-secret-renames";

const logger = createLogger({ module: "custom-widget" });

export const updateCustomWidgetProcedure = permissionRequiredProcedure
  .requiresPermission("admin")
  .meta({
    mcp: {
      enabled: true,
      description:
        "Update one Custom JSX widget. Prefer templateLines for multiline JSX changes. Returns a client-navigable edit link.",
    },
  })
  .input(customWidgetUpdateSchema)
  .mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.query.customWidgetDefinitions.findFirst({
      where: eq(customWidgetDefinitions.id, input.id),
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

    if (input.expectedSavedRevision && customWidgetSavedRevision(existing) !== input.expectedSavedRevision) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "The saved widget changed. Reload or review the saved version before saving your draft.",
      });
    }
    const current = parseStoredCustomWidgetDefinition(existing);
    const {
      id,
      secrets,
      sourceRenames,
      editorLayout,
      expectedSavedRevision: _expectedSavedRevision,
      ...authoringChanges
    } = input;
    const definition = parseCustomWidgetAuthoringInput(() => {
      const changes = normalizeCustomWidgetAuthoringUpdate(authoringChanges);
      const candidate = { ...current, ...changes };
      // An explicit return to v2 removes inherited extensions; supplied extensions still fail validation.
      if (changes.$schema === "homarr-custom-widget-v2" && changes.extensions === undefined)
        delete candidate.extensions;
      return customWidgetDefinitionSchema.parse(candidate);
    });
    if (secrets) assertSecretSources(definition.sources, secrets);
    const secretRenames = prepareSourceSecretRenames(current.sources, definition.sources, sourceRenames);
    const renamedTargets = new Set(secretRenames.map((rename) => rename.to));
    const definitionChanges = {
      ...serializeCustomWidgetDefinition(definition),
      updatedAt: new Date(),
      ...(editorLayout ? { editorLayout: JSON.stringify(editorLayout) } : {}),
    };
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
        return previous && !renamedTargets.has(sourceId) && !hasSameSecretBinding(previous, source) ? [sourceId] : [];
      }),
    );

    await handleTransactionsAsync(ctx.db, {
      async handleAsync(db, schema) {
        await db.transaction(async (transaction) => {
          const result = await transaction
            .update(schema.customWidgetDefinitions)
            .set(definitionChanges)
            .where(customWidgetDefinitionMatch(existing, Boolean(editorLayout)));
          assertCustomWidgetDefinitionChanged(result);

          for (const rename of secretRenames) {
            await transaction
              .update(schema.customWidgetSecrets)
              .set({ sourceId: rename.temporary })
              .where(
                and(
                  eq(schema.customWidgetSecrets.definitionId, id),
                  eq(schema.customWidgetSecrets.sourceId, rename.from),
                ),
              );
          }
          for (const rename of secretRenames) {
            await transaction
              .update(schema.customWidgetSecrets)
              .set({ sourceId: rename.to })
              .where(
                and(
                  eq(schema.customWidgetSecrets.definitionId, id),
                  eq(schema.customWidgetSecrets.sourceId, rename.temporary),
                ),
              );
          }

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
                and(eq(schema.customWidgetSecrets.definitionId, id), eq(schema.customWidgetSecrets.sourceId, sourceId)),
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
          const result = transaction
            .update(customWidgetDefinitions)
            .set(definitionChanges)
            .where(customWidgetDefinitionMatch(existing, Boolean(editorLayout)))
            .run();
          assertCustomWidgetDefinitionChanged(result);

          for (const rename of secretRenames) {
            transaction
              .update(customWidgetSecrets)
              .set({ sourceId: rename.temporary })
              .where(and(eq(customWidgetSecrets.definitionId, id), eq(customWidgetSecrets.sourceId, rename.from)))
              .run();
          }
          for (const rename of secretRenames) {
            transaction
              .update(customWidgetSecrets)
              .set({ sourceId: rename.to })
              .where(and(eq(customWidgetSecrets.definitionId, id), eq(customWidgetSecrets.sourceId, rename.temporary)))
              .run();
          }

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
    const secretPresence = await ctx.db
      .select({ sourceId: customWidgetSecrets.sourceId, kind: customWidgetSecrets.kind })
      .from(customWidgetSecrets)
      .where(eq(customWidgetSecrets.definitionId, id));
    return {
      id,
      secretPresence,
      managementPath: `/manage/custom-widgets/edit/${id}`,
      savedRevision: customWidgetSavedRevision({ ...existing, ...definitionChanges }),
    };
  });
