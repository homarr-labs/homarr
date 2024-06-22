import type { JobGroupKeys } from "@homarr/cron-jobs";
import { jobGroup } from "@homarr/cron-jobs";

import { createSubPubChannel } from "../../redis/src/lib/channel";
import { zodEnumFromArray } from "../../validation/src/enums";

const cronJobRunnerChannel = createSubPubChannel<JobGroupKeys>("cron-job-runner", { persist: false });

/**
 * Registers the cron job runner to listen to the Redis PubSub channel.
 */
export const registerCronJobRunner = () => {
  cronJobRunnerChannel.subscribe((jobName) => {
    jobGroup.runManually(jobName);
  });
};

/**
 * Triggers a cron job to run immediately.
 * This works over the Redis PubSub channel.
 * @param jobName name of the job to be triggered
 */
export const triggerCronJobAsync = async (jobName: JobGroupKeys) => {
  await cronJobRunnerChannel.publishAsync(jobName);
};

export const jobNameSchema = zodEnumFromArray(jobGroup.getKeys());
