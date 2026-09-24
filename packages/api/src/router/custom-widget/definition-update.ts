import { createHash } from "node:crypto";

import { TRPCError } from "@trpc/server";

import { encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { and, eq, handleTransactionsAsync, notInArray } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import type { CustomWidgetDefinition, CustomWidgetSecret } from "@homarr/db/schema";
import { getCustomWidgetSourceAuthType } from "@homarr/custom-widgets/core";
import type { CustomWidgetCreateInput, HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

import { hasSameSecretBinding, requiredSecretKinds } from "./secret-policy";
import { parseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";

type StoredDefinitionState = Pick<
  CustomWidgetDefinition,
  | "id"
  | "name"
  | "description"
  | "iconUrl"
  | "sources"
  | "requests"
  | "options"
  | "template"
  | "enabled"
  | "creatorId"
  | "updatedAt"
>;
type StoredSecretState = Pick<CustomWidgetSecret, "sourceId" | "kind" | "encryptedValue" | "updatedAt">;

export function getCustomWidgetDefinitionStateFingerprint(
  definition: StoredDefinitionState,
  secrets: readonly StoredSecretState[],
) {
  const value = JSON.stringify({
    definition: {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      iconUrl: definition.iconUrl,
      sources: definition.sources,
      requests: definition.requests,
      options: definition.options,
      template: definition.template,
      enabled: definition.enabled,
      creatorId: definition.creatorId,
      updatedAt: definition.updatedAt.getTime(),
    },
    secrets: secrets
      .map((secret) => ({
        sourceId: secret.sourceId,
        kind: secret.kind,
        encryptedValue: secret.encryptedValue,
        updatedAt: secret.updatedAt.getTime(),
      }))
      .toSorted((left, right) => `${left.sourceId}:${left.kind}`.localeCompare(`${right.sourceId}:${right.kind}`)),
  });
  return createHash("sha256").update(value).digest("base64url");
}

export async function updateCustomWidgetDefinition(
  db: Database,
  input: {
    id: string;
    definition: HomarrCustomWidgetV2;
    secrets?: CustomWidgetCreateInput["secrets"];
    expectedStateFingerprint?: string;
  },
) {
  const updatedAt = new Date();
  const definitionChanges = { ...serializeCustomWidgetDefinition(input.definition), updatedAt };
  const secretRows = input.secrets?.map((secret) => ({
    definitionId: input.id,
    sourceId: secret.sourceId,
    kind: secret.kind,
    encryptedValue: encryptSecret(secret.value),
    updatedAt,
  }));

  await handleTransactionsAsync(db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        const [stored] = await transaction
          .select()
          .from(schema.customWidgetDefinitions)
          .where(eq(schema.customWidgetDefinitions.id, input.id))
          .limit(1)
          .for("update");
        if (!stored) throw new TRPCError({ code: "NOT_FOUND" });
        const storedSecrets = await transaction
          .select()
          .from(schema.customWidgetSecrets)
          .where(eq(schema.customWidgetSecrets.definitionId, input.id));
        assertExpectedState(stored, storedSecrets, input.expectedStateFingerprint);
        const changedSecretBindings = getChangedSecretBindings(stored, input.definition);
        const sourceIds = Object.keys(input.definition.sources);

        await transaction
          .update(schema.customWidgetDefinitions)
          .set(definitionChanges)
          .where(eq(schema.customWidgetDefinitions.id, input.id));
        await transaction
          .delete(schema.customWidgetSecrets)
          .where(
            and(
              eq(schema.customWidgetSecrets.definitionId, input.id),
              notInArray(schema.customWidgetSecrets.sourceId, sourceIds),
            ),
          );
        for (const sourceId of changedSecretBindings) {
          await transaction
            .delete(schema.customWidgetSecrets)
            .where(
              and(
                eq(schema.customWidgetSecrets.definitionId, input.id),
                eq(schema.customWidgetSecrets.sourceId, sourceId),
              ),
            );
        }
        for (const [sourceId, source] of Object.entries(input.definition.sources)) {
          const kinds = [...requiredSecretKinds(getCustomWidgetSourceAuthType(source))];
          const where = and(
            eq(schema.customWidgetSecrets.definitionId, input.id),
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
                eq(schema.customWidgetSecrets.definitionId, input.id),
                eq(schema.customWidgetSecrets.sourceId, secret.sourceId),
                eq(schema.customWidgetSecrets.kind, secret.kind),
              ),
            );
          await transaction.insert(schema.customWidgetSecrets).values(secret);
        }
      });
    },
    handleSync(database) {
      database.transaction(
        (transaction) => {
          const stored = transaction
            .select()
            .from(customWidgetDefinitions)
            .where(eq(customWidgetDefinitions.id, input.id))
            .limit(1)
            .get();
          if (!stored) throw new TRPCError({ code: "NOT_FOUND" });
          const storedSecrets = transaction
            .select()
            .from(customWidgetSecrets)
            .where(eq(customWidgetSecrets.definitionId, input.id))
            .all();
          assertExpectedState(stored, storedSecrets, input.expectedStateFingerprint);
          const changedSecretBindings = getChangedSecretBindings(stored, input.definition);
          const sourceIds = Object.keys(input.definition.sources);

          transaction
            .update(customWidgetDefinitions)
            .set(definitionChanges)
            .where(eq(customWidgetDefinitions.id, input.id))
            .run();
          transaction
            .delete(customWidgetSecrets)
            .where(
              and(eq(customWidgetSecrets.definitionId, input.id), notInArray(customWidgetSecrets.sourceId, sourceIds)),
            )
            .run();
          for (const sourceId of changedSecretBindings) {
            transaction
              .delete(customWidgetSecrets)
              .where(and(eq(customWidgetSecrets.definitionId, input.id), eq(customWidgetSecrets.sourceId, sourceId)))
              .run();
          }
          for (const [sourceId, source] of Object.entries(input.definition.sources)) {
            const kinds = [...requiredSecretKinds(getCustomWidgetSourceAuthType(source))];
            const where = and(
              eq(customWidgetSecrets.definitionId, input.id),
              eq(customWidgetSecrets.sourceId, sourceId),
            );
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
                  eq(customWidgetSecrets.definitionId, input.id),
                  eq(customWidgetSecrets.sourceId, secret.sourceId),
                  eq(customWidgetSecrets.kind, secret.kind),
                ),
              )
              .run();
            transaction.insert(customWidgetSecrets).values(secret).run();
          }
        },
        { behavior: "immediate" },
      );
    },
  });
}

function assertExpectedState(
  definition: StoredDefinitionState,
  secrets: readonly StoredSecretState[],
  expectedStateFingerprint?: string,
) {
  if (expectedStateFingerprint === undefined) return;
  if (getCustomWidgetDefinitionStateFingerprint(definition, secrets) === expectedStateFingerprint) return;
  throw new TRPCError({
    code: "CONFLICT",
    message:
      "Custom widget definition or credentials changed after this preview was created. Create a new preview and retry.",
  });
}

function getChangedSecretBindings(stored: StoredDefinitionState, definition: HomarrCustomWidgetV2) {
  const current = parseStoredCustomWidgetDefinition(stored);
  return new Set(
    Object.entries(definition.sources).flatMap(([sourceId, source]) => {
      const previous = current.sources[sourceId];
      return previous && !hasSameSecretBinding(previous, source) ? [sourceId] : [];
    }),
  );
}
