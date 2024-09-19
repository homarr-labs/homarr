import { decryptSecret } from "@homarr/common";
import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { OpenMediaVaultIntegration } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const healthMonitoringJob = createCronJob("healthMonitoring", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "healthMonitoring"),
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
      const openmediavault = new OpenMediaVaultIntegration({
        ...integration.integration,
        decryptedSecrets: integration.integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      });
      const healthInfo = await openmediavault.getSystemInfoAsync();
      const channel = createItemAndIntegrationChannel("healthMonitoring", integration.integrationId);
      await channel.publishAndUpdateLastStateAsync(healthInfo);
    }
  }
});
