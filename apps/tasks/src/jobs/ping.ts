import { logger } from "@homarr/log";
import { pingChannel, pingUrlChannel } from "@homarr/redis";

import { EVERY_MINUTE } from "~/lib/cron-job/constants";
import { createCronJob } from "~/lib/cron-job/creator";

export const pingJob = createCronJob(EVERY_MINUTE).withCallback(async () => {
  const urls = await pingUrlChannel.getAllAsync();

  for (const url of new Set(urls)) {
    const response = await fetch(url);
    logger.debug(`executed ping for url ${url} with status code ${response.status}`);
    await pingChannel.publishAsync({
      url,
      statusCode: response.status,
    });
  }
});
