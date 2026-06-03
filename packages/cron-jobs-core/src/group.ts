import type { Cron } from "croner";

import { objectEntries, objectKeys } from "@homarr/common";
import { db } from "@homarr/db";

import type { JobCallback } from "./creator";
import { createProcessDiagnosticsSnapshot } from "./diagnostics";
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

    const tasks = new Map<string, Cron>();

    return {
      initializeAsync: async () => {
        options.logger.logInfo("Initializing cron job group", {
          registeredJobs: [...jobRegistry.keys()],
          diagnostics: createProcessDiagnosticsSnapshot(),
        });
        const configurations = await db.query.cronJobConfigurations.findMany();
        for (const job of jobRegistry.values()) {
          const configuration = configurations.find(({ name }) => name === job.name);
          if (configuration?.isEnabled === false) {
            continue;
          }
          if (tasks.has(job.name)) {
            continue;
          }

          const scheduledTask = await job.createTaskAsync();

          tasks.set(job.name, scheduledTask);
          options.logger.logDebug("Created scheduled task for cron job", {
            name: job.name,
            diagnostics: createProcessDiagnosticsSnapshot(),
          });
        }
        options.logger.logInfo("Cron job group initialized", {
          taskCount: tasks.size,
          diagnostics: createProcessDiagnosticsSnapshot(),
        });
      },
      startAsync: async (name: keyof TJobs) => {
        const job = jobRegistry.get(name as string);
        if (!job) return;
        if (!tasks.has(job.name)) return;

        options.logger.logInfo("Starting schedule of cron job.", {
          name: job.name,
        });
        await job.onStartAsync();
        tasks.get(name as string)?.resume();
      },
      startAllAsync: async () => {
        options.logger.logInfo("Starting all cron jobs", {
          taskCount: tasks.size,
          diagnostics: createProcessDiagnosticsSnapshot(),
        });
        for (const job of jobRegistry.values()) {
          if (!tasks.has(job.name)) {
            continue;
          }

          options.logger.logInfo("Starting schedule of cron job.", {
            name: job.name,
          });
          await job.onStartAsync();
          tasks.get(job.name)?.resume();
        }
        options.logger.logInfo("Started all cron jobs", {
          taskCount: tasks.size,
          diagnostics: createProcessDiagnosticsSnapshot(),
        });
      },
      runManuallyAsync: async (name: keyof TJobs) => {
        const job = jobRegistry.get(name as string);
        if (!job) return;
        if (job.preventManualExecution) {
          throw new Error(`The job "${job.name}" can not be executed manually.`);
        }

        options.logger.logInfo("Running schedule cron job manually.", {
          name: job.name,
        });
        await tasks.get(name as string)?.trigger();
      },
      stop: (name: keyof TJobs) => {
        const job = jobRegistry.get(name as string);
        if (!job) return;

        options.logger.logInfo("Stopping schedule of cron job.", {
          name: job.name,
        });
        tasks.get(name as string)?.pause();
      },
      stopAll: () => {
        for (const job of jobRegistry.values()) {
          options.logger.logInfo("Stopping schedule of cron job.", {
            name: job.name,
          });
          tasks.get(job.name)?.pause();
        }
      },
      getJobRegistry() {
        return jobRegistry as Map<TAllowedNames, ReturnType<JobCallback<TAllowedNames, TAllowedNames>>>;
      },
      getTask(name: keyof TJobs) {
        return tasks.get(name as string) ?? null;
      },
      setTask(name: keyof TJobs, cron: Cron) {
        tasks.set(name as string, cron);
      },
      getKeys() {
        return objectKeys(jobs);
      },
    };
  };
};
