import { sendServerAnalyticsAsync } from "@homarr/analytics";
import { EVERY_WEEK } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";

import { createCronJob } from "../lib";

export const analyticsJob = createCronJob("analytics", EVERY_WEEK, {
  runOnStart: true,
  preventManualExecution: true,
}).withCallback(async () => {
  const analyticSetting = await getServerSettingByKeyAsync(db, "analytics");

  if (!analyticSetting.enableGeneral) {
    return;
  }

  await sendServerAnalyticsAsync();
});
