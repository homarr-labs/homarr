import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { integrationCreatorFromSecrets } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";

export const healthMonitoringJob = createCronJob("healthMonitoring", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["healthMonitoring"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const integration of itemForIntegration.integrations) {
      const openmediavault = integrationCreatorFromSecrets(integration.integration);
      const healthInfo = await openmediavault.getSystemInfoAsync();
      const channel = createItemAndIntegrationChannel("healthMonitoring", integration.integrationId);
      await channel.publishAndUpdateLastStateAsync(healthInfo);
    }
  }
});
