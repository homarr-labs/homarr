import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { dnsHoleRequestHandler } from "@homarr/request-handler/dns-hole";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const dnsHoleJob = createCronJob("dnsHole", EVERY_5_SECONDS).withCallback(
  createRequestIntegrationJobHandler(dnsHoleRequestHandler.handler, {
    widgetKinds: ["dnsHoleSummary", "dnsHoleControls"],
    getInput: {
      dnsHoleSummary: () => ({}),
      dnsHoleControls: () => ({}),
    },
  }),
);
