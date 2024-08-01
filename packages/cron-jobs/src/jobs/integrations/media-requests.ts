import { decryptSecret } from "@homarr/common";
import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db, eq, or } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import type { MediaRequestList, MediaRequestStats } from "@homarr/integrations";
import { JellyseerrIntegration, OverseerrIntegration } from "@homarr/integrations";
import { logger } from "@homarr/log";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const mediaRequestsJob = createCronJob("mediaRequests", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: or(eq(items.kind, "mediaRequests-requestList"), eq(items.kind, "mediaRequests-requestStats")),
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
    for (const { integration } of itemForIntegration.integrations) {
      const integrationWithSecrets = {
        ...integration,
        decryptedSecrets: integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      };
      let requestsIntegration: OverseerrIntegration;
      switch (integration.kind) {
        case "jellyseerr":
          requestsIntegration = new JellyseerrIntegration(integrationWithSecrets);
          break;
        case "overseerr":
          requestsIntegration = new OverseerrIntegration(integrationWithSecrets);
          break;
        default:
          logger.warn(`Unable to process media requests kind '${integration.kind}'. Skipping this integration`);
          continue;
      }

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
