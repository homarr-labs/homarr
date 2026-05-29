import { EVERY_DAY } from "@homarr/cron-jobs-core/expressions";
import { updateCheckerRequestHandler } from "@homarr/request-handler/update-checker";

import { createCronJob } from "../lib";

export const updateCheckerJob = createCronJob("updateChecker", EVERY_DAY, {
  runOnStart: true,
}).withCallback(async () => {
  const handler = updateCheckerRequestHandler.handler({});
  await handler.getCachedOrUpdatedDataAsync({});
});
