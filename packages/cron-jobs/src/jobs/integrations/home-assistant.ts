import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
// This import is done that way to avoid circular dependencies.
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";
import { smartHomeEntityStateRequestHandler } from "@homarr/request-handler/smart-home-entity-state";

import { createCronJob } from "../../lib";

export const smartHomeEntityStateJob = createCronJob("smartHomeEntityState", EVERY_MINUTE).withCallback(
  createRequestIntegrationJobHandler(smartHomeEntityStateRequestHandler.handler, {
    widgetKinds: ["smartHome-entityState"],
    getInput: {
      "smartHome-entityState": (options) => ({
        entityId: options.entityId,
      }),
    },
  }),
);
