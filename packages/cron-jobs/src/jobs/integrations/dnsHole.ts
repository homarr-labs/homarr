import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import { integrationCreatorFromSecrets } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const dnsHoleJob = createCronJob("dnsHole", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["dnsHoleSummary", "dnsHoleControls"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const { integration } of itemForIntegration.integrations) {
      const integrationInstance = integrationCreatorFromSecrets(integration);
      await integrationInstance
        .getSummaryAsync()
        .then(async (data) => {
          const channel = createItemAndIntegrationChannel<DnsHoleSummary>(itemForIntegration.kind, integration.id);
          await channel.publishAndUpdateLastStateAsync(data);
        })
        .catch((error) => console.error(`Could not retrieve data for ${integration.name}: "${error}"`));
    }
  }
});
