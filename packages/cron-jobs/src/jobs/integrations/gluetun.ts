import { EVERY_30_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { gluetunVPNStatusHandler } from "@homarr/request-handler/gluetun";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const gluetunJob = createCronJob("gluetun", EVERY_30_SECONDS).withCallback(
  createRequestIntegrationJobHandler(gluetunVPNStatusHandler.handler, {
    widgetKinds: ["gluetun"],
    getInput: {
      gluetun: () => ({}),
    },
  }),
);
