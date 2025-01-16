import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { clusterInfoRequestHandler, systemInfoRequestHandler } from "@homarr/request-handler/health-monitoring";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const healthMonitoringJob = createCronJob("healthMonitoring", EVERY_5_SECONDS).withCallback(
  // This is temporary until we combine them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRequestIntegrationJobHandler(systemInfoRequestHandler.handler as any, {
    widgetKinds: ["healthMonitoring"],
    getInput: {
      healthMonitoring: () => ({}),
    },
  }),
);

export const clusterHealthMonitoringJob = createCronJob("clusterHealthMonitoring", EVERY_5_SECONDS).withCallback(
  // This is temporary until we combine them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createRequestIntegrationJobHandler(clusterInfoRequestHandler.handler as any, {
    widgetKinds: ["healthMonitoring"],
    getInput: {
      healthMonitoring: () => ({}),
    },
  }),
);
