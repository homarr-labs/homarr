import { decryptSecret } from "@homarr/common";
import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import type { DownloadClientIntegration, DownloadClientJobsAndStatus } from "@homarr/integrations";
import { integrationCreatorByKind } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

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
    for (const { integration, integrationId } of itemForIntegration.integrations) {
      const integrationWithDecryptedSecrets = {
        ...integration,
        decryptedSecrets: integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      };
      const integrationInstance = integrationCreatorByKind(
        integration.kind as typeof DownloadClientIntegration.DownloadClientKinds[number],
        integrationWithDecryptedSecrets,
      );
      const data = await integrationInstance.getClientJobsAndStatusAsync();
      const channel = createItemAndIntegrationChannel<DownloadClientJobsAndStatus>("downloads", integrationId);
      await channel.publishAndUpdateLastStateAsync(data);
    }
  }
});
