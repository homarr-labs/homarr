import { decryptSecret } from "@homarr/common";
import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { ProwlarrIntegration } from "@homarr/integrations";

import { createCronJob } from "../../lib";

export const indexerManagerJob = createCronJob("indexerManager", EVERY_MINUTE).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "indexerManager"),
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
    const integration = itemForIntegration.integrations[0]?.integration;
    if (!integration) {
      continue;
    }

    const prowlarr = new ProwlarrIntegration({
      ...integration,
      decryptedSecrets: integration.secrets.map((secret) => ({
        ...secret,
        value: decryptSecret(secret.value),
      })),
    });
    await prowlarr.getIndexersAsync();
  }
});
