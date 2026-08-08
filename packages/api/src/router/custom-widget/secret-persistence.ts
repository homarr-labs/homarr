import { TRPCError } from "@trpc/server";

import { encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { and, eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import type { CustomWidgetCreateInput, CustomWidgetSecretKind, CustomWidgetSource } from "@homarr/custom-widgets/core";
import { customWidgetSourceSchema, hasSameCustomWidgetSourceAuthentication } from "@homarr/custom-widgets/core";

import { assertSecretSources, hasSameSecretBinding } from "./secret-policy";
import { parseStoredCustomWidgetDefinition, serializeCustomWidgetDefinition } from "./stored-definition";

type CustomWidgetSecretInput = CustomWidgetCreateInput["secrets"][number];

type ConfigureCustomWidgetSourceInput = {
  definitionId: string;
  sourceId: string;
  baseUrl: string;
  networkScope?: CustomWidgetSource["networkScope"];
  secrets: CustomWidgetCreateInput["secrets"];
  expectedSource?: CustomWidgetSource;
};

type SourceConfigurationIssue = "definition-not-found" | "source-not-found" | "binding-changed";

class SourceConfigurationError extends Error {
  constructor(readonly issue: SourceConfigurationIssue) {
    super(`Custom widget source configuration failed: ${issue}`);
    this.name = "SourceConfigurationError";
  }
}

export async function setCustomWidgetSecret(db: Database, definitionId: string, secret: CustomWidgetSecretInput) {
  const updatedAt = new Date();
  const secretRow = {
    definitionId,
    sourceId: secret.sourceId,
    kind: secret.kind,
    encryptedValue: encryptSecret(secret.value),
    updatedAt,
  };
  await handleTransactionsAsync(db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        await transaction
          .delete(schema.customWidgetSecrets)
          .where(
            and(
              eq(schema.customWidgetSecrets.definitionId, definitionId),
              eq(schema.customWidgetSecrets.sourceId, secret.sourceId),
              eq(schema.customWidgetSecrets.kind, secret.kind),
            ),
          );
        await transaction.insert(schema.customWidgetSecrets).values(secretRow);
        await transaction
          .update(schema.customWidgetDefinitions)
          .set({ updatedAt })
          .where(eq(schema.customWidgetDefinitions.id, definitionId));
      });
    },
    handleSync(database) {
      database.transaction((transaction) => {
        transaction
          .delete(customWidgetSecrets)
          .where(
            and(
              eq(customWidgetSecrets.definitionId, definitionId),
              eq(customWidgetSecrets.sourceId, secret.sourceId),
              eq(customWidgetSecrets.kind, secret.kind),
            ),
          )
          .run();
        transaction.insert(customWidgetSecrets).values(secretRow).run();
        transaction
          .update(customWidgetDefinitions)
          .set({ updatedAt })
          .where(eq(customWidgetDefinitions.id, definitionId))
          .run();
      });
    },
  });
}

export async function configureCustomWidgetSource(db: Database, input: ConfigureCustomWidgetSourceInput) {
  try {
    return await persistCustomWidgetSourceConfiguration(db, input);
  } catch (error) {
    if (!(error instanceof SourceConfigurationError)) throw error;
    if (error.issue === "definition-not-found") throw new TRPCError({ code: "NOT_FOUND" });
    if (error.issue === "source-not-found") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Widget source not found" });
    }
    throw new TRPCError({
      code: "CONFLICT",
      message: "Widget source authentication changed while it was being configured",
    });
  }
}

export async function configureCustomWidgetSourceFromRequest(
  db: Database,
  input: ConfigureCustomWidgetSourceInput & { expectedSource: CustomWidgetSource },
) {
  try {
    return {
      status: "configured" as const,
      source: await persistCustomWidgetSourceConfiguration(db, input),
    };
  } catch (error) {
    if (!(error instanceof SourceConfigurationError)) throw error;
    return { status: error.issue } as const;
  }
}

async function persistCustomWidgetSourceConfiguration(db: Database, input: ConfigureCustomWidgetSourceInput) {
  let configuredSource: CustomWidgetSource | undefined;
  const secretRows = input.secrets.map((secret) => ({
    definitionId: input.definitionId,
    sourceId: input.sourceId,
    kind: secret.kind,
    encryptedValue: encryptSecret(secret.value),
    updatedAt: new Date(),
  }));
  await handleTransactionsAsync(db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        const [stored] = await transaction
          .select()
          .from(schema.customWidgetDefinitions)
          .where(eq(schema.customWidgetDefinitions.id, input.definitionId))
          .limit(1)
          .for("update");
        const sourceUpdate = prepareSourceUpdate(stored, input);
        configuredSource = sourceUpdate.source;
        await transaction
          .update(schema.customWidgetDefinitions)
          .set(sourceUpdate.definitionChanges)
          .where(eq(schema.customWidgetDefinitions.id, input.definitionId));
        if (sourceUpdate.bindingChanged) {
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
    handleSync(database) {
      database.transaction(
        (transaction) => {
          const stored = transaction
            .select()
            .from(customWidgetDefinitions)
            .where(eq(customWidgetDefinitions.id, input.definitionId))
            .limit(1)
            .get();
          const sourceUpdate = prepareSourceUpdate(stored, input);
          configuredSource = sourceUpdate.source;
          transaction
            .update(customWidgetDefinitions)
            .set(sourceUpdate.definitionChanges)
            .where(eq(customWidgetDefinitions.id, input.definitionId))
            .run();
          if (sourceUpdate.bindingChanged) {
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
        },
        { behavior: "immediate" },
      );
    },
  });
  if (!configuredSource) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  return configuredSource;
}

function prepareSourceUpdate(
  stored: Parameters<typeof parseStoredCustomWidgetDefinition>[0] | undefined,
  input: ConfigureCustomWidgetSourceInput,
) {
  if (!stored) throw new SourceConfigurationError("definition-not-found");
  const definition = parseStoredCustomWidgetDefinition(stored);
  const previousSource = definition.sources[input.sourceId];
  if (!previousSource) throw new SourceConfigurationError("source-not-found");
  if (input.expectedSource && !hasSameCustomWidgetSourceAuthentication(previousSource, input.expectedSource)) {
    throw new SourceConfigurationError("binding-changed");
  }
  const source = customWidgetSourceSchema.parse({
    ...previousSource,
    baseUrl: input.baseUrl,
    networkScope: input.networkScope ?? previousSource.networkScope,
  });
  assertSecretSources({ [input.sourceId]: source }, input.secrets);
  return {
    source,
    bindingChanged: !hasSameSecretBinding(previousSource, source),
    definitionChanges: {
      ...serializeCustomWidgetDefinition({
        ...definition,
        sources: { ...definition.sources, [input.sourceId]: source },
      }),
      updatedAt: new Date(),
    },
  };
}

export async function clearCustomWidgetSecret(
  db: Database,
  input: {
    definitionId: string;
    sourceId: string;
    kind: CustomWidgetSecretKind;
  },
) {
  const updatedAt = new Date();
  await handleTransactionsAsync(db, {
    async handleAsync(database, schema) {
      await database.transaction(async (transaction) => {
        await transaction
          .delete(schema.customWidgetSecrets)
          .where(
            and(
              eq(schema.customWidgetSecrets.definitionId, input.definitionId),
              eq(schema.customWidgetSecrets.sourceId, input.sourceId),
              eq(schema.customWidgetSecrets.kind, input.kind),
            ),
          );
        await transaction
          .update(schema.customWidgetDefinitions)
          .set({ updatedAt })
          .where(eq(schema.customWidgetDefinitions.id, input.definitionId));
      });
    },
    handleSync(database) {
      database.transaction((transaction) => {
        transaction
          .delete(customWidgetSecrets)
          .where(
            and(
              eq(customWidgetSecrets.definitionId, input.definitionId),
              eq(customWidgetSecrets.sourceId, input.sourceId),
              eq(customWidgetSecrets.kind, input.kind),
            ),
          )
          .run();
        transaction
          .update(customWidgetDefinitions)
          .set({ updatedAt })
          .where(eq(customWidgetDefinitions.id, input.definitionId))
          .run();
      });
    },
  });
}
