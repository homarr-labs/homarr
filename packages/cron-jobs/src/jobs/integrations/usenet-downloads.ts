import {createCronJob} from "../../lib";
import {EVERY_5_SECONDS} from "@homarr/cron-jobs-core/expressions";
import {db, eq,} from "@homarr/db";
import {items} from "@homarr/db/schema/sqlite";
import type { UsenetQueueItem} from "@homarr/integrations";
import {NzbGetIntegration, SabnzbdIntegration} from "@homarr/integrations";
import {decryptSecret} from "@homarr/common";
import {createItemAndIntegrationChannel} from "@homarr/redis";

export const usenetDownloadsJob = createCronJob("usenet-downloads", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "usenet-downloads"),
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
      const integrationInstance = integration.integration.kind === "sabNzbd" ?
        new SabnzbdIntegration(integrationWithDecryptedSecrets) :
        new NzbGetIntegration(integrationWithDecryptedSecrets);
      const queue = await integrationInstance.getCurrentQueueAsync();
      const channel = createItemAndIntegrationChannel<UsenetQueueItem[]>("usenet-downloads", integration.integrationId);
      await channel.publishAndUpdateLastStateAsync(queue);
    }
  }
});
