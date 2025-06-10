import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";
import { firewallRequestHandler } from "@homarr/request-handler/firewall";

import { createCronJob } from "../../lib";

export const firewallJob = createCronJob('firewall', EVERY_MINUTE).withCallback(
  createRequestIntegrationJobHandler(firewallRequestHandler.handler, {
    widgetKinds: ["firewall"],
    getInput: {
      firewall: () => ({}),
    },
  }),
);
