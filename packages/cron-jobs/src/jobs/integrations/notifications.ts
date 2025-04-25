import { EVERY_30_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";
import { notificationsRequestHandler } from "@homarr/request-handler/notifications";

import { createCronJob } from "../../lib";

export const refreshNotificationsJob = createCronJob("refreshNotifications", EVERY_30_SECONDS).withCallback(
  createRequestIntegrationJobHandler(notificationsRequestHandler.handler, {
    widgetKinds: ["notifications"],
    getInput: {
      notifications: (options) => options,
    },
  }),
);
