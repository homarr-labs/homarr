import { createId } from "@homarr/common";
import { encryptSecret } from "@homarr/common/server";
import type { Database } from "@homarr/db";
import { handleTransactionsAsync } from "@homarr/db";
import { customWidgetDefinitions, customWidgetSecrets } from "@homarr/db/schema";
import type { CustomWidgetCreateInput, HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";

import { serializeCustomWidgetDefinition } from "./stored-definition";

export async function insertCustomWidgetDefinition(
  db: Database,
  definition: HomarrCustomWidgetV2,
  creatorId: string,
  secrets: CustomWidgetCreateInput["secrets"],
) {
  const id = createId();
  const definitionRow = { id, ...serializeCustomWidgetDefinition(definition), creatorId };
  const updatedAt = new Date();
  const secretRows = secrets.map((secret) => ({
    definitionId: id,
    sourceId: secret.sourceId,
    kind: secret.kind,
    encryptedValue: encryptSecret(secret.value),
    updatedAt,
  }));

  await handleTransactionsAsync(db, {
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

  return id;
}
