import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { clusterInfoRequestHandler, systemInfoRequestHandler } from "@homarr/request-handler/health-monitoring";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const healthMonitoringJob = createCronJob("healthMonitoring", EVERY_5_SECONDS).withCallback(
  createRequestIntegrationJobHandler(systemInfoRequestHandler.handler, {
    widgetKinds: ["healthMonitoring"],
    getInput: {
      healthMonitoring: () => ({}),
    },
  }),
);

export const clusterHealthMonitoringJob = createCronJob("clusterHealthMonitoring", EVERY_5_SECONDS).withCallback(
  createRequestIntegrationJobHandler(clusterInfoRequestHandler.handler, {
    widgetKinds: ["healthMonitoring"],
    getInput: {
      healthMonitoring: () => ({}),
    },
  }),
);
