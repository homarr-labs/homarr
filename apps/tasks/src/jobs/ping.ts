import { logger } from "@homarr/log";
import { sendPingRequestAsync } from "@homarr/ping";
import { pingChannel, pingUrlChannel } from "@homarr/redis";

import { EVERY_MINUTE } from "~/lib/cron-job/constants";
import { createCronJob } from "~/lib/cron-job/creator";

export const pingJob = createCronJob(EVERY_MINUTE).withCallback(async () => {
  const urls = await pingUrlChannel.getAllAsync();

  for (const url of new Set(urls)) {
    const pingResult = await sendPingRequestAsync(url);

    if ("statusCode" in pingResult) {
      logger.debug(`executed ping for url ${url} with status code ${pingResult.statusCode}`);
    } else {
      logger.error(`Executing ping for url ${url} failed with error: ${pingResult.error}`);
    }

    await pingChannel.publishAsync({
      url,
      ...pingResult,
    });
  }
});
