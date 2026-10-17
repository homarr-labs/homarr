import type { Cron } from "croner";

import { objectEntries, objectKeys } from "@homarr/common";
import { db } from "@homarr/db";

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
    const creatingTasks = new Map<string, Promise<Cron>>();
    const startingTasks = new Map<string, Promise<void>>();

    const ensureTaskAsync = async (
      name: string,
      configurations?: readonly { name: string; cronExpression: string }[],
    ) => {
      const task = tasks.get(name);
      if (task && !task.isStopped()) return task;

      const job = jobRegistry.get(name);
      if (!job) return;

      const existingCreation = creatingTasks.get(name);
      if (existingCreation) return await existingCreation;

      const creation = (async () => {
        let configuration = configurations?.find((savedConfiguration) => savedConfiguration.name === name);
        if (!configurations) {
          configuration = await db.query.cronJobConfigurations.findFirst({
            where: (cronJobConfigurations, { eq }) => eq(cronJobConfigurations.name, name),
          });
        }

        const createdTask = job.createTask(configuration);
        tasks.set(name, createdTask);
        return createdTask;
      })().finally(() => creatingTasks.delete(name));
      creatingTasks.set(name, creation);
      return await creation;
    };

    const startAsync = async (name: string) => {
      const existingStart = startingTasks.get(name);
      if (existingStart) return await existingStart;

      const job = jobRegistry.get(name);
      if (!job) return;

      const start = (async () => {
        const task = await ensureTaskAsync(name);
        if (!task || task.isRunning()) return;

        options.logger.logInfo("Starting schedule of cron job.", { name });
        await job.onStartAsync();
        task.resume();
      })().finally(() => startingTasks.delete(name));
      startingTasks.set(name, start);
      await start;
    };

    return {
      initializeAsync: async () => {
        const configurations = await db.query.cronJobConfigurations.findMany();
        for (const name of Object.keys(jobs)) {
          const configuration = configurations.find((savedConfiguration) => savedConfiguration.name === name);
          if (configuration?.isEnabled === false) {
            continue;
          }

          await ensureTaskAsync(name, configurations);
        }
      },
      startAsync: async (name: keyof TJobs) => await startAsync(name as string),
      startAllAsync: async () => {
        for (const name of Object.keys(jobs)) {
          if (!tasks.has(name)) {
            continue;
          }

          await startAsync(name);
        }
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
        for (const name of Object.keys(jobs)) {
          options.logger.logInfo("Stopping schedule of cron job.", {
            name,
          });
          tasks.get(name)?.pause();
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
