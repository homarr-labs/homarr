import { sendServerAnalyticsAsync } from "@homarr/analytics";
import { env } from "@homarr/common/env";
import { EVERY_WEEK } from "@homarr/cron-jobs-core/expressions";

import { createCronJob } from "../lib";

export const analyticsJob = createCronJob("analytics", EVERY_WEEK, {
  runOnStart: true,
  preventManualExecution: true,
  preventCustomInterval: true,
  hidden: true,
}).withCallback(async () => {
  if (env.NO_EXTERNAL_CONNECTION) return;
  await sendServerAnalyticsAsync();
});
