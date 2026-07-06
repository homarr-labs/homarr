import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { db, inArray } from "@homarr/db";
import { items } from "@homarr/db/schema";
import { decryptSecret } from "@homarr/common/server";
import {
  beszelAlertsRequestHandler,
  beszelSystemsRequestHandler,
} from "@homarr/request-handler/beszel";

import { createCronJob } from "../../lib";

const logger = createLogger({ module: "beszelJob" });

const beszelWidgetKinds = ["beszelSystemTable", "beszelSystemGrid", "beszelAlerts", "beszelSystemStats"] as const;

export const beszelJob = createCronJob("beszel", EVERY_5_SECONDS).withCallback(async () => {
  const beszelItems = await db.query.items.findMany({
    where: inArray(items.kind, beszelWidgetKinds),
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

  const seen = new Set<string>();
  const unique: {
    integration: (typeof beszelItems)[number]["integrations"][number]["integration"];
  }[] = [];

  for (const item of beszelItems) {
    for (const { integration } of item.integrations) {
      if (seen.has(integration.id)) continue;
      seen.add(integration.id);
      unique.push({ integration });
    }
  }

  await Promise.allSettled(
    unique.flatMap(({ integration }) => {
      const decryptedSecrets = integration.secrets.map((secret) => ({
        ...secret,
        value: decryptSecret(secret.value),
      }));

      const enriched = {
        ...integration,
        kind: integration.kind as "beszel",
        decryptedSecrets,
        externalUrl: null as string | null,
      };

      const handlers = [
        {
          name: "systems",
          handler: beszelSystemsRequestHandler.handler(enriched, {}),
        },
        {
          name: "alerts",
          handler: beszelAlertsRequestHandler.handler(enriched, {
            includeHistory: true,
            maxHistoryItems: 10,
          }),
        },
      ];

      return handlers.map(async ({ name, handler }) => {
        try {
          await handler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
        } catch (error) {
          logger.error(
            new ErrorWithMetadata(
              `Failed to force-update Beszel ${name}`,
              { integrationId: integration.id },
              { cause: error },
            ),
          );
        }
      });
    }),
  );
});
