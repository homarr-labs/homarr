import { decryptSecret } from "@homarr/common/server";
import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { JellyfinIntegration } from "@homarr/integrations";
import { createItemAndIntegrationChannel } from "@homarr/redis";

import { createCronJob } from "../../lib";

export const mediaServerJob = createCronJob("mediaServer", EVERY_5_SECONDS).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "mediaServer"),
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
      const jellyfinIntegration = new JellyfinIntegration({
        ...integration.integration,
        decryptedSecrets: integration.integration.secrets.map((secret) => ({
          ...secret,
          value: decryptSecret(secret.value),
        })),
      });
      const streamSessions = await jellyfinIntegration.getCurrentSessionsAsync();
      const channel = createItemAndIntegrationChannel("mediaServer", integration.integrationId);
      await channel.publishAndUpdateLastStateAsync(streamSessions);
    }
  }
});
