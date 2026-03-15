import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";
import { tracearrRequestHandler } from "@homarr/request-handler/tracearr";

import { createCronJob } from "../../lib";

export const tracearrJob = createCronJob("tracearr", EVERY_5_SECONDS).withCallback(
  createRequestIntegrationJobHandler(tracearrRequestHandler.handler, {
    widgetKinds: ["tracearr"],
    getInput: {
      tracearr: () => ({}),
    },
  }),
);
