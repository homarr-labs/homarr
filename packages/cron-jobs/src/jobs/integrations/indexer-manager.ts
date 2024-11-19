import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { indexerManagerRequestHandler } from "@homarr/request-handler/indexer-manager";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const indexerManagerJob = createCronJob("indexerManager", EVERY_MINUTE).withCallback(
  createRequestIntegrationJobHandler(indexerManagerRequestHandler.handler, {
    widgetKinds: ["indexerManager"],
    getInput: {
      indexerManager: () => ({}),
    },
  }),
);
