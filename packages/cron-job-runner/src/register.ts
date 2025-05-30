import { jobGroup } from "@homarr/cron-jobs";

import { cronJobRunnerChannel } from ".";

/**
 * Registers the cron job runner to listen to the Redis PubSub channel.
 */
export const registerCronJobRunner = () => {
  cronJobRunnerChannel.subscribe((jobName) => {
    void jobGroup.runManuallyAsync(jobName);
  });
};
