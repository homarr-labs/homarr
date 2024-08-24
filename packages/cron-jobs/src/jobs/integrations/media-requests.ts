import { decryptSecret } from "@homarr/common";
import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import type { MediaRequestList, MediaRequestStats } from "@homarr/integrations";
import { integrationCreatorByKind } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const mediaRequestsJob = createCronJob("mediaRequests", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["mediaRequests-requestList", "mediaRequests-requestStats"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    for (const { integration, integrationId } of itemForIntegration.integrations) {
      const integrationWithSecrets = {
        ...integration,
        decryptedSecrets: integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      };

      const requestsIntegration = integrationCreatorByKind(integration.kind, integrationWithSecrets);

      const mediaRequests = await requestsIntegration.getRequestsAsync();
      const requestsStats = await requestsIntegration.getStatsAsync();
      const requestsUsers = await requestsIntegration.getUsersAsync();
      const requestListChannel = createItemAndIntegrationChannel<MediaRequestList>(
        "mediaRequests-requestList",
        integrationId,
      );
      await requestListChannel.publishAndUpdateLastStateAsync({
        integration: { id: integration.id },
        medias: mediaRequests,
      });

      const requestStatsChannel = createItemAndIntegrationChannel<MediaRequestStats>(
        "mediaRequests-requestStats",
        integrationId,
      );
      await requestStatsChannel.publishAndUpdateLastStateAsync({
        integration: { kind: integration.kind, name: integration.name },
        stats: requestsStats,
        users: requestsUsers,
      });
    }
  }
});
