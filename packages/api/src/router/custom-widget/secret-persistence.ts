import { encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { and, eq, handleTransactionsAsync } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import type {
  CustomWidgetCreateInput,
  CustomWidgetSecretKind,
  CustomWidgetSource,
  HomarrCustomWidgetV2,
} from "@homarr/custom-widgets/core";

import { hasSameSecretBinding } from "./secret-policy";
import { serializeCustomWidgetDefinition } from "./stored-definition";

type CustomWidgetSecretInput = CustomWidgetCreateInput["secrets"][number];

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

export async function configureCustomWidgetSource(
  db: Database,
  input: {
    definitionId: string;
    sourceId: string;
    definition: HomarrCustomWidgetV2;
    previousSource: CustomWidgetSource;
    source: CustomWidgetSource;
    secrets: CustomWidgetCreateInput["secrets"];
  },
) {
  const definitionChanges = {
    ...serializeCustomWidgetDefinition(input.definition),
    updatedAt: new Date(),
  };
  const bindingChanged = !hasSameSecretBinding(input.previousSource, input.source);
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
    handleSync(database) {
      database.transaction((transaction) => {
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
