import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { firewallRequestHandler } from "@homarr/request-handler/firewall";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const firewallJob = createCronJob("firewall", EVERY_MINUTE).withCallback(
  createRequestIntegrationJobHandler(firewallRequestHandler.handler, {
    widgetKinds: ["firewall"],
    getInput: {
      firewall: () => ({}),
    },
  }),
);
