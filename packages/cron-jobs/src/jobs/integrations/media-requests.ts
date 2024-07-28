import {createCronJob} from "../../lib";
import {EVERY_5_SECONDS} from "@homarr/cron-jobs-core/expressions";
import {db, eq, or} from "@homarr/db";
import {items} from "@homarr/db/schema/sqlite";
import type {MediaRequest, MediaRequestStats} from "@homarr/integrations";
import { MediaRequestStatus} from "@homarr/integrations";
import {JellyseerrIntegration, OverseerrIntegration} from "@homarr/integrations";
import {decryptSecret} from "@homarr/common";
import {createItemAndIntegrationChannel} from "@homarr/redis";
import {logger} from "@homarr/log";

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
    for (const integration of itemForIntegration.integrations) {
      const integrationWithSecrets = {
        ...integration.integration,
        decryptedSecrets: integration.integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      };
      let requestsIntegration: OverseerrIntegration;
      switch (integration.integration.kind) {
        case "jellyseerr":
          requestsIntegration = new JellyseerrIntegration(integrationWithSecrets);
          break;
        case "overseerr":
          requestsIntegration = new OverseerrIntegration(integrationWithSecrets);
          break;
        default:
          logger.warn(`Unable to process media requests kind '${integration.integration.kind}'. Skipping this integration`);
          continue;
      }

      const mediaRequests = await requestsIntegration.getRequestsAsync();
      const requestListChannel = createItemAndIntegrationChannel<MediaRequest[]>("mediaRequests-requestList", integration.integrationId);
      await requestListChannel.publishAndUpdateLastStateAsync(mediaRequests);

      const requestStatsChannel = createItemAndIntegrationChannel<MediaRequestStats>("mediaRequests-requestStats", integration.integrationId);
      await requestStatsChannel.publishAndUpdateLastStateAsync({
        values: [
          {
            name: "approved",
            value: mediaRequests.filter(request => request.status === MediaRequestStatus.Approved).length,
          },
          {
            name: "pending",
            value: mediaRequests.filter(request => request.status === MediaRequestStatus.PendingApproval).length,
          },
          {
            name: "declined",
            value: mediaRequests.filter(request => request.status === MediaRequestStatus.Declined).length,
          },
          {
            name: "shows",
            value: mediaRequests.filter(request => request.type === "tv").length,
          },
          {
            name: "movies",
            value: mediaRequests.filter(request => request.type === "movie").length,
          },
          {
            name: "total",
            value: mediaRequests.length,
          },
        ]
      });
    }
  }
});
