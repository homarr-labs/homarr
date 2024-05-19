import SuperJSON from "superjson";

import { sendServerAnalyticsAsync } from "@homarr/analytics";
import { db, eq } from "@homarr/db";
import { serverSettings } from "@homarr/db/schema/sqlite";

import { EVERY_WEEK } from "~/lib/cron-job/constants";
import { createCronJob } from "~/lib/cron-job/creator";
import type { defaultServerSettings } from "../../../../packages/server-settings";

export const analyticsJob = createCronJob(EVERY_WEEK, {
  runOnStart: true,
}).withCallback(async () => {
  const analyticSetting = await db.query.serverSettings.findFirst({
    where: eq(serverSettings.settingKey, "analytics"),
  });

  if (!analyticSetting) {
    return;
  }

  const value = SuperJSON.parse<(typeof defaultServerSettings)["analytics"]>(
    analyticSetting.value,
  );

  if (!value.enableGeneral) {
    return;
  }

  await sendServerAnalyticsAsync();
});
