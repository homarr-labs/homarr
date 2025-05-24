import { objectEntries, objectKeys } from "@homarr/common";

import type { JobCallback } from "./creator";
import type { Logger } from "./logger";
import { jobRegistry } from "./registry";

type Jobs<TAllowedNames extends string> = {
  [name in TAllowedNames]: ReturnType<JobCallback<TAllowedNames, name>>;
};

export interface CreateCronJobGroupCreatorOptions {
  logger: Logger;
}

export const createJobGroupCreator = <TAllowedNames extends string = string>(
  options: CreateCronJobGroupCreatorOptions,
) => {
  return <TJobs extends Jobs<TAllowedNames>>(jobs: TJobs) => {
    options.logger.logDebug(`Creating job group with ${Object.keys(jobs).length} jobs.`);
    for (const [key, job] of objectEntries(jobs)) {
      if (typeof key !== "string" || typeof job.name !== "string") continue;

      options.logger.logDebug(`Added job ${job.name} to the job registry.`);
      jobRegistry.set(key, {
        ...job,
        name: job.name,
      });
    }

    return {
      startAsync: async (name: keyof TJobs) => {
        const job = jobRegistry.get(name as string);
        if (!job) return;

        options.logger.logInfo(`Starting schedule cron job ${job.name}.`);
        await job.onStartAsync();
        await job.scheduledTask?.start();
      },
      startAllAsync: async () => {
        for (const job of jobRegistry.values()) {
          options.logger.logInfo(`Starting schedule of cron job ${job.name}.`);
          await job.onStartAsync();
          await job.scheduledTask?.start();
        }
      },
      runManuallyAsync: async (name: keyof TJobs) => {
        const job = jobRegistry.get(name as string);
        if (!job) return;

        options.logger.logInfo(`Running schedule cron job ${job.name} manually.`);
        await job.scheduledTask?.execute();
      },
      stopAsync: async (name: keyof TJobs) => {
        const job = jobRegistry.get(name as string);
        if (!job) return;

        options.logger.logInfo(`Stopping schedule cron job ${job.name}.`);
        await job.scheduledTask?.stop();
      },
      stopAllAsync: async () => {
        for (const job of jobRegistry.values()) {
          options.logger.logInfo(`Stopping schedule cron job ${job.name}.`);
          await job.scheduledTask?.stop();
        }
      },
      getJobRegistry() {
        return jobRegistry as Map<TAllowedNames, ReturnType<JobCallback<TAllowedNames, TAllowedNames>>>;
      },
      getKeys() {
        return objectKeys(jobs);
      },
    };
  };
};
