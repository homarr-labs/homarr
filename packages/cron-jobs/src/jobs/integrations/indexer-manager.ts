import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import { integrationCreatorFromSecrets } from "@homarr/integrations";

import { createCronJob } from "../../lib";

export const indexerManagerJob = createCronJob("indexerManager", EVERY_MINUTE).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["indexerManager"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const { integration } of itemForIntegration.integrations) {
      const integrationInstance = integrationCreatorFromSecrets(integration);
      await integrationInstance.getIndexersAsync();
    }
  }
});
