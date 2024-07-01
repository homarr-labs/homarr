import SuperJSON from "superjson";

import { sendServerAnalyticsAsync } from "@homarr/analytics";
import { EVERY_WEEK } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { serverSettings } from "@homarr/db/schema/sqlite";
import type { defaultServerSettings } from "@homarr/server-settings";

import { createCronJob } from "../lib";

export const analyticsJob = createCronJob("analytics", EVERY_WEEK, {
  runOnStart: true,
}).withCallback(async () => {
  const analyticSetting = await db.query.serverSettings.findFirst({
    where: eq(serverSettings.settingKey, "analytics"),
  });

  if (!analyticSetting) {
    return;
  }

  const value = SuperJSON.parse<(typeof defaultServerSettings)["analytics"]>(analyticSetting.value);

  if (!value.enableGeneral) {
    return;
  }

  await sendServerAnalyticsAsync();
});
