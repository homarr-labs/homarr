import { EVERY_MINUTE } from "@homarr/cron-jobs-core/expressions";
import { db } from "@homarr/db";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import { logger } from "@homarr/log";
import { pingUrlChannel } from "@homarr/redis";
import { pingRequestHandler } from "@homarr/request-handler/ping";

import { createCronJob } from "../lib";

const resetPreviousUrlsAsync = async () => {
  await pingUrlChannel.clearAsync();
  logger.info("Cleared previous ping urls");
};

export const pingJob = createCronJob("ping", EVERY_MINUTE, {
  beforeStart: resetPreviousUrlsAsync,
}).withCallback(async () => {
  const boardSettings = await getServerSettingByKeyAsync(db, "board");

  if (boardSettings.forceDisableStatus) {
    logger.debug("Simple ping is disabled by server settings");
    return;
  }

  const urls = await pingUrlChannel.getAllAsync();

  await Promise.allSettled([...new Set(urls)].map(pingAsync));
});

const pingAsync = async (url: string) => {
  const handler = pingRequestHandler.handler({ url });
  await handler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
};
