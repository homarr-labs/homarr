import { EVERY_30_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";
import { umamiActiveVisitorsRequestHandler } from "@homarr/request-handler/umami";

import { createCronJob } from "../../lib";

export const umamiActiveVisitorsJob = createCronJob("umamiActiveVisitors", EVERY_30_SECONDS).withCallback(
  createRequestIntegrationJobHandler(umamiActiveVisitorsRequestHandler.handler, {
    widgetKinds: ["umami"],
    getInput: {
      umami: (options) => (options.websiteId ? { websiteId: options.websiteId } : []),
    },
  }),
);
