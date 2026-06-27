import { EVERY_30_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { vpnSummaryHandler } from "@homarr/request-handler/vpn";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const vpnJob = createCronJob("vpn", EVERY_30_SECONDS).withCallback(
  createRequestIntegrationJobHandler(vpnSummaryHandler.handler, {
    widgetKinds: ["vpn"],
    getInput: {
      vpn: () => ({}),
    },
  }),
);
