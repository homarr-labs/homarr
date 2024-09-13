import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import { integrationCreatorFromSecrets } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const mediaServerJob = createCronJob("mediaServer", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["mediaServer"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const { integration } of itemForIntegration.integrations) {
      const integrationInstance = integrationCreatorFromSecrets(integration);
      const streamSessions = await integrationInstance.getCurrentSessionsAsync();
      const channel = createItemAndIntegrationChannel("mediaServer", integration.id);
      await channel.publishAndUpdateLastStateAsync(streamSessions);
    }
  }
});
