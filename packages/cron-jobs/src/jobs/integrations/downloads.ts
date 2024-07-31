import { decryptSecret } from "@homarr/common";
import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import type { DownloadClientData, DownloadClientIntegration, IntegrationInput } from "@homarr/integrations";
import { integrationCreatorByKind } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import type { IntegrationKind } from "../../../../definitions/src";
import { createCronJob } from "../../lib";

export const downloadsJob = createCronJob("downloads", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "downloads"),
    with: {
      integrations: {
        with: {
          integration: {
            with: {
              secrets: {
                columns: {
                  kind: true,
                  value: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const integration of itemForIntegration.integrations) {
      const integrationWithDecryptedSecrets = {
        ...integration.integration,
        decryptedSecrets: integration.integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      };
      const integrationInstance = getIntegrationInstance(integration.integration.kind, integrationWithDecryptedSecrets);
      const data = await integrationInstance.getClientDataAsync();
      const channel = createItemAndIntegrationChannel<DownloadClientData>("downloads", integration.integrationId);
      await channel.publishAndUpdateLastStateAsync(data);
    }
  }
});

function getIntegrationInstance(kind: IntegrationKind, integration: IntegrationInput): DownloadClientIntegration {
  switch (kind) {
    case "sabNzbd":
    case "nzbGet":
    case "qBittorrent":
    case "deluge":
    case "transmission":
      return integrationCreatorByKind(kind, integration) as DownloadClientIntegration;
    default:
      throw new Error("BAD_REQUEST");
  }
}
