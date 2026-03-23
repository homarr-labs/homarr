import { objectEntries, objectKeys } from "@homarr/common";
import { db } from "@homarr/db";
import { jobRegistry } from "@homarr/cron-jobs-core";

import type { JobCallback } from "@homarr/cron-jobs-core";
import type { Logger } from "@homarr/cron-jobs-core";

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
    options.logger.logDebug("Creating job group.", {
      jobCount: Object.keys(jobs).length,
    });
    for (const [key, job] of objectEntries(jobs)) {
      if (typeof key !== "string" || typeof job.name !== "string") continue;

      options.logger.logDebug("Registering job in the job registry.", {
        name: job.name,
      });
      jobRegistry.set(key, {
        ...job,
        name: job.name,
      });
    }

    return {
      initializeAsync: async () => {
        // No tasks to create, just ensure jobs are registered
        const configurations = await db.query.cronJobConfigurations.findMany();
        for (const job of jobs) {
          const configuration = configurations.find(({ name }) => name === job.name);
          if (configuration?.isEnabled === false) {
            continue;
          }
          // Run onStart if needed
          await job.onStartAsync();
        }
      },
      startAsync: async (name: keyof TJobs) => {
        // In new system, start means enable, but since we trigger manually, just log
        const job = jobs[name];
        if (!job) return;

        options.logger.logInfo("Enabling cron job.", {
          name: job.name,
        });
        await job.onStartAsync();
      },
      startAllAsync: async () => {
        for (const job of Object.values(jobs)) {
          options.logger.logInfo("Enabling cron job.", {
            name: job.name,
          });
          await job.onStartAsync();
        }
      },
      runManuallyAsync: async (name: keyof TJobs) => {
        const job = jobs[name];
        if (!job) return;
        if (job.preventManualExecution) {
          throw new Error(`The job "${job.name}" can not be executed manually.`);
        }

        options.logger.logInfo("Running cron job manually.", {
          name: job.name,
        });
        await job.executeAsync();
      },
      stopAsync: async (name: keyof TJobs) => {
        // In new system, stop means disable, but since no tasks, just log
        const job = jobs[name];
        if (!job) return;

        options.logger.logInfo("Disabling cron job.", {
          name: job.name,
        });
      },
      stopAllAsync: async () => {
        for (const job of Object.values(jobs)) {
          options.logger.logInfo("Disabling cron job.", {
            name: job.name,
          });
        }
      },
      getJobRegistry() {
        // Return a map of jobs
        const registry = new Map();
        for (const [key, job] of objectEntries(jobs)) {
          registry.set(key, job);
        }
        return registry;
      },
      getTask() {
        // No tasks in new system
        return null;
      },
      setTask() {
        // No tasks
      },
      getKeys() {
        return objectKeys(jobs);
      },
    };
  };
};