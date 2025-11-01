import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";
import { systemUsageRequestHandler } from "@homarr/request-handler/system-usage";

import { createCronJob } from "../../lib";

export const systemUsageJob = createCronJob("systemUsage", EVERY_MINUTE).withCallback(
  createRequestIntegrationJobHandler(systemUsageRequestHandler.handler, {
    widgetKinds: ["systemUsage"],
    getInput: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      systemUsage: (options) => ({ systemId: options.systemId! }),
    },
  }),
);
