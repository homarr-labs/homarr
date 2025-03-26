import { objectKeys } from "@homarr/common";
import type { JobGroupKeys } from "@homarr/cron-jobs";
import { createSubPubChannel } from "@homarr/redis";
import { zodEnumFromArray } from "@homarr/validation";

export const cronJobRunnerChannel = createSubPubChannel<JobGroupKeys>("cron-job-runner", { persist: false });

export const cronJobs = {
  analytics: { disabled: true },
  iconsUpdater: { disabled: false },
  ping: { disabled: false },
  smartHomeEntityState: { disabled: false },
  mediaServer: { disabled: false },
  mediaOrganizer: { disabled: false },
  downloads: { disabled: false },
  dnsHole: { disabled: false },
  mediaRequestStats: { disabled: false },
  mediaRequestList: { disabled: false },
  rssFeeds: { disabled: false },
  indexerManager: { disabled: false },
  healthMonitoring: { disabled: false },
  sessionCleanup: { disabled: false },
  updateChecker: { disabled: false },
  mediaTranscoding: { disabled: false },
  minecraftServerStatus: { disabled: false },
} satisfies Record<JobGroupKeys, { disabled?: boolean }>;

/**
 * Triggers a cron job to run immediately.
 * This works over the Redis PubSub channel.
 * @param jobName name of the job to be triggered
 */
export const triggerCronJobAsync = async (jobName: JobGroupKeys) => {
  if (cronJobs[jobName].disabled) {
    throw new Error(`The job "${jobName}" is disabled`);
  }
  await cronJobRunnerChannel.publishAsync(jobName);
};

export const cronJobNames = objectKeys(cronJobs);

export const jobNameSchema = zodEnumFromArray(cronJobNames);
