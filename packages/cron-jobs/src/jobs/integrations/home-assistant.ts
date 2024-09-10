import SuperJSON from "superjson";

import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getItemsWithIntegrationsAsync } from "@homarr/db/queries";
import { integrationCreatorFromSecrets } from "@homarr/integrations";
import { logger } from "@homarr/log";
import { homeAssistantEntityState } from "@homarr/redis";

// This import is done that way to avoid circular dependencies.
import type { WidgetComponentProps } from "../../../../widgets";
import { createCronJob } from "../../lib";

export const smartHomeEntityStateJob = createCronJob("smartHomeEntityState", EVERY_MINUTE).withCallback(async () => {
  const itemsForIntegration = await getItemsWithIntegrationsAsync(db, {
    kinds: ["smartHome-entityState"],
  });

  for (const itemForIntegration of itemsForIntegration) {
    const integration = itemForIntegration.integrations[0]?.integration;
    if (!integration) {
      continue;
    }

    const options = SuperJSON.parse<WidgetComponentProps<"smartHome-entityState">["options"]>(
      itemForIntegration.options,
    );

    const homeAssistant = integrationCreatorFromSecrets(integration);
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
