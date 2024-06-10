import SuperJSON from "superjson";

import { decryptSecret } from "@homarr/common";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { HomeAssistantIntegration } from "@homarr/integrations";
import { logger } from "@homarr/log";
import { homeAssistantEntityState } from "@homarr/redis";
import type { WidgetComponentProps } from "@homarr/widgets";

import { EVERY_MINUTE } from "~/lib/cron-job/constants";
import { createCronJob } from "~/lib/cron-job/creator";

export const smartHomeEntityStateJob = createCronJob(EVERY_MINUTE).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "smartHome-entityState"),
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

    const options = SuperJSON.parse<WidgetComponentProps<"smartHome-entityState">["options"]>(
      itemForIntegration.options,
    );

    const homeAssistant = new HomeAssistantIntegration({
      ...integration,
      decryptedSecrets: integration.secrets.map((secret) => ({
        ...secret,
        value: decryptSecret(secret.value),
      })),
    });
    const state = await homeAssistant.getEntityStateAsync(options.entityId);

    if (!state.success) {
      logger.error("Unable to fetch data from Home Assistant");
      continue;
    }

    await homeAssistantEntityState.publishAsync({
      entityId: options.entityId,
      state: state.data.state,
    });
  }
});
