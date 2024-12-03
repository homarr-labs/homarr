import { encryptSecret } from "@homarr/common/server";
import { mapAndDecryptIntegrations } from "../../mappers/map-integration";
import { createDbInsertCollection } from "./common";
import type { PreparedIntegration } from "../../prepare/prepare-integrations";

export const createIntegrationInsertCollection = (
    preparedIntegrations: PreparedIntegration[],
    encryptionToken: string | null,
  ) => {
    const insertCollection = createDbInsertCollection();
  
    if (encryptionToken === "temp" || encryptionToken === null) {
      return insertCollection;
    }
  
    const preparedIntegrationsDecrypted = mapAndDecryptIntegrations(preparedIntegrations, encryptionToken);
  
    preparedIntegrationsDecrypted.forEach((integration) => {
      insertCollection.integrations.push({
        id: integration.id,
        kind: integration.kind,
        name: integration.name,
        url: integration.url,
      });
  
      integration.secrets.forEach((secret) => {
        insertCollection.integrationSecrets.push({
          integrationId: integration.id,
          kind: secret.field,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value: encryptSecret(secret.value!),
        });
      });
    });
  
    return insertCollection;
  };