import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import type { MediaRequestList, MediaRequestStats } from "@homarr/integrations";
import { integrationCreatorFromSecrets } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const mediaRequestsJob = createCronJob("mediaRequests", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["mediaRequests-requestList", "mediaRequests-requestStats"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const { integration } of itemForIntegration.integrations) {
      const requestsIntegration = integrationCreatorFromSecrets(integration);

      const mediaRequests = await requestsIntegration.getRequestsAsync();
      const requestsStats = await requestsIntegration.getStatsAsync();
      const requestsUsers = await requestsIntegration.getUsersAsync();
      const requestListChannel = createItemAndIntegrationChannel<MediaRequestList>(
        "mediaRequests-requestList",
        integration.id,
      );
      await requestListChannel.publishAndUpdateLastStateAsync({
        integration: { id: integration.id },
        medias: mediaRequests,
      });

      const requestStatsChannel = createItemAndIntegrationChannel<MediaRequestStats>(
        "mediaRequests-requestStats",
        integration.id,
      );
      await requestStatsChannel.publishAndUpdateLastStateAsync({
        integration: { kind: integration.kind, name: integration.name },
        stats: requestsStats,
        users: requestsUsers,
      });
    }
  }
});
