import { objectKeys } from "@homarr/common";
import type { JobGroupKeys } from "@homarr/cron-jobs";
import { createSubPubChannel } from "@homarr/redis";
import { zodEnumFromArray } from "@homarr/validation/enums";

export const cronJobRunnerChannel = createSubPubChannel<JobGroupKeys>("cron-job-runner", { persist: false });

export const cronJobs = {
  analytics: { preventManualExecution: true },
  iconsUpdater: { preventManualExecution: false },
  ping: { preventManualExecution: false },
  smartHomeEntityState: { preventManualExecution: false },
  mediaServer: { preventManualExecution: false },
  mediaOrganizer: { preventManualExecution: false },
  downloads: { preventManualExecution: false },
  dnsHole: { preventManualExecution: false },
  mediaRequestStats: { preventManualExecution: false },
  mediaRequestList: { preventManualExecution: false },
  rssFeeds: { preventManualExecution: false },
  indexerManager: { preventManualExecution: false },
  healthMonitoring: { preventManualExecution: false },
  sessionCleanup: { preventManualExecution: false },
  updateChecker: { preventManualExecution: false },
  mediaTranscoding: { preventManualExecution: false },
  minecraftServerStatus: { preventManualExecution: false },
  networkController: { preventManualExecution: false },
  dockerContainers: { preventManualExecution: false },
  refreshNotifications: { preventManualExecution: false },
} satisfies Record<JobGroupKeys, { preventManualExecution?: boolean }>;

/**
 * Triggers a cron job to run immediately.
 * This works over the Redis PubSub channel.
 * @param jobName name of the job to be triggered
 */
export const triggerCronJobAsync = async (jobName: JobGroupKeys) => {
  if (cronJobs[jobName].preventManualExecution) {
    throw new Error(`The job "${jobName}" can not be executed manually`);
  }
  await cronJobRunnerChannel.publishAsync(jobName);
};

export const cronJobNames = objectKeys(cronJobs);

export const jobNameSchema = zodEnumFromArray(cronJobNames);
