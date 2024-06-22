import { objectEntries } from "@homarr/common";

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
      // @ts-expect-error - TS doesn't know that the job.name is a string will be fixed in ts 5.5
      jobRegistry.set(key, job);
    }

    return {
      start: (name: keyof TJobs) => {
        const job = jobRegistry.get(name as string);
        if (!job) return;

        options.logger.logInfo(`Starting cron job ${job.name}.`);
        job.scheduledTask.start();
      },
      startAll: () => {
        for (const job of jobRegistry.values()) {
          options.logger.logInfo(`Starting cron job ${job.name}.`);
          job.scheduledTask.start();
        }
      },
      stop: (name: keyof TJobs) => {
        const job = jobRegistry.get(name as string);
        if (!job) return;

        options.logger.logInfo(`Stopping cron job ${job.name}.`);
        job.scheduledTask.stop();
      },
      stopAll: () => {
        for (const job of jobRegistry.values()) {
          options.logger.logInfo(`Stopping cron job ${job.name}.`);
          job.scheduledTask.stop();
        }
      },
      getJobRegistry() {
        return jobRegistry as Map<TAllowedNames, ReturnType<JobCallback<TAllowedNames, TAllowedNames>>>;
      },
    };
  };
};
