import { Cron } from "croner";

import type { Logger } from "./logger";

export interface JobClock {
  now(): Date;
  monotonicMilliseconds(): number;
}

export interface JobConfiguration<TName extends string = string> {
  name: TName;
  cronExpression: string;
  isEnabled: boolean;
}

export interface JobConfigurationStore<TName extends string> {
  getAllAsync(): Promise<readonly JobConfiguration<TName>[]>;
  updateAsync(
    name: TName,
    patch: Partial<Pick<JobConfiguration<TName>, "cronExpression" | "isEnabled">>,
    defaults: JobConfiguration<TName>,
  ): Promise<JobConfiguration<TName>>;
}

export interface JobRunContext {
  signal: AbortSignal;
  clock: JobClock;
}

export interface RuntimeJob<TName extends string = string> {
  name: TName;
  cronExpression: string;
  timezone?: string;
  runOnStart: boolean;
  preventManualExecution: boolean;
  preventCustomInterval: boolean;
  hidden: boolean;
  expectedMaximumDurationInMillis: number;
  beforeStartAsync?: () => Promise<void>;
  executeAsync(context: JobRunContext): Promise<void>;
}

export interface JobStatusLifecycle<TName extends string> {
  repairInterruptedAsync(names: readonly TName[]): Promise<void>;
  beginAsync(name: TName): Promise<string>;
  finishAsync(name: TName, runId: string, result: "success" | "error"): Promise<void>;
}

export interface JobSchedule {
  resume(): void;
  pause(): void;
  stop(): void;
}

export interface JobScheduler {
  validate(expression: string, timezone?: string): void;
  create(expression: string, timezone: string | undefined, callback: () => Promise<void>): JobSchedule;
}

export const cronerJobScheduler: JobScheduler = {
  validate(expression, timezone) {
    const task = new Cron(expression, { timezone, paused: true });
    try {
      task.nextRun();
    } finally {
      task.stop();
    }
  },
  create(expression, timezone, callback) {
    return new Cron(expression, { timezone, paused: true }, callback);
  },
};

export type JobsLifecycleState =
  | "configured"
  | "initializing"
  | "ready"
  | "starting"
  | "running"
  | "draining"
  | "stopped"
  | "failed";

export interface JobsRuntimeOptions<TName extends string> {
  jobs: readonly RuntimeJob<TName>[];
  configuration: JobConfigurationStore<TName>;
  status: JobStatusLifecycle<TName>;
  clock: JobClock;
  logger: Logger;
  assertReadyAsync(): Promise<void>;
  cleanupAsync(): Promise<void>;
  scheduler?: JobScheduler;
}

export const createJobsRuntime = <TName extends string>(options: JobsRuntimeOptions<TName>) => {
  const jobs = new Map(options.jobs.map((job) => [job.name, job]));
  if (jobs.size !== options.jobs.length) throw new Error("Duplicate cron job names");
  const tasks = new Map<TName, JobSchedule>();
  const configurations = new Map<TName, JobConfiguration<TName>>();
  const runs = new Set<Promise<void>>();
  const controllers = new Set<AbortController>();
  const scheduler = options.scheduler ?? cronerJobScheduler;
  let state: JobsLifecycleState = "configured";
  let controls: Promise<void> = Promise.resolve();
  let initialization: Promise<void> | undefined;
  let stopping: Promise<void> | undefined;
  const isDraining = () => state === "draining";

  const serialize = <T>(callback: () => Promise<T>): Promise<T> => {
    const result = controls.then(callback);
    controls = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const getJob = (name: TName) => {
    const job = jobs.get(name);
    if (!job) throw new Error(`Job ${name} not found`);
    return job;
  };

  const assertAccepting = () => {
    if (state !== "ready" && state !== "running" && state !== "starting") {
      throw new Error(`Cron jobs are not ready: ${state}`);
    }
  };

  const executeAsync = (job: RuntimeJob<TName>): Promise<void> => {
    assertAccepting();
    const controller = new AbortController();
    controllers.add(controller);
    const run = (async () => {
      const started = options.clock.monotonicMilliseconds();
      let runId: string | undefined;
      try {
        await options.assertReadyAsync();
        controller.signal.throwIfAborted();
        runId = await options.status.beginAsync(job.name);
        controller.signal.throwIfAborted();
        options.logger.logDebug("The callback of cron job started", { name: job.name });
        await job.executeAsync({ signal: controller.signal, clock: options.clock });
        const durationInMillis = options.clock.monotonicMilliseconds() - started;
        if (durationInMillis > job.expectedMaximumDurationInMillis) {
          options.logger.logWarning("The callback of cron job took longer than expected", {
            name: job.name,
            durationInMillis,
            expectedMaximumDurationInMillis: job.expectedMaximumDurationInMillis,
          });
        }
        await options.status.finishAsync(job.name, runId, controller.signal.aborted ? "error" : "success");
      } catch (error) {
        options.logger.logError(new Error(`The callback of cron job ${job.name} failed`, { cause: error }));
        if (runId) {
          try {
            await options.status.finishAsync(job.name, runId, "error");
          } catch (statusError) {
            options.logger.logError(
              new Error(`Updating status of cron job ${job.name} failed`, { cause: statusError }),
            );
          }
        }
      }
    })();
    runs.add(run);
    void run.finally(() => {
      runs.delete(run);
      controllers.delete(controller);
    });
    return run;
  };

  const createTask = (job: RuntimeJob<TName>, configuration: JobConfiguration<TName>) => {
    const expression = job.preventCustomInterval ? job.cronExpression : configuration.cronExpression;
    scheduler.validate(expression, job.timezone);
    return scheduler.create(expression, job.timezone, async () => {
      if (state !== "running" && state !== "starting" && state !== "ready") return;
      await executeAsync(job);
    });
  };

  const startJobAsync = async (job: RuntimeJob<TName>) => {
    assertAccepting();
    await options.assertReadyAsync();
    const configuration = configurations.get(job.name);
    let task = tasks.get(job.name);
    if (!task) {
      if (!configuration?.isEnabled) return;
      task = createTask(job, configuration);
      tasks.set(job.name, task);
    }
    await job.beforeStartAsync?.();
    if (job.runOnStart) await executeAsync(job);
    if (state !== "draining" && state !== "stopped") task.resume();
  };

  const initializeAsync = (): Promise<void> => {
    if (initialization) return initialization;
    initialization = serialize(async () => {
      if (state !== "configured") throw new Error(`Cannot initialize cron jobs: ${state}`);
      state = "initializing";
      try {
        await options.assertReadyAsync();
        try {
          await options.cleanupAsync();
        } catch (error) {
          options.logger.logError(new Error("Failed to clean up sessions", { cause: error }));
        }
        await options.status.repairInterruptedAsync([...jobs.keys()]);
        const stored = await options.configuration.getAllAsync();
        if (isDraining()) return;
        for (const job of jobs.values()) {
          const configuration = stored.find((entry) => entry.name === job.name) ?? {
            name: job.name,
            cronExpression: job.cronExpression,
            isEnabled: true,
          };
          configurations.set(job.name, configuration);
          if (configuration.isEnabled) tasks.set(job.name, createTask(job, configuration));
        }
        state = "ready";
      } catch (error) {
        for (const task of tasks.values()) task.stop();
        tasks.clear();
        if (!isDraining()) state = "failed";
        throw error;
      }
    });
    return initialization;
  };

  const updateConfigurationAsync = async (
    name: TName,
    patch: Partial<Pick<JobConfiguration<TName>, "cronExpression" | "isEnabled">>,
  ) => {
    assertAccepting();
    await options.assertReadyAsync();
    const job = getJob(name);
    const configuration = await options.configuration.updateAsync(name, patch, {
      name,
      cronExpression: job.cronExpression,
      isEnabled: true,
    });
    configurations.set(name, configuration);
    return configuration;
  };

  return {
    initializeAsync,
    runEffectAsync: <T>(callback: (context: JobRunContext) => Promise<T>): Promise<T> => {
      assertAccepting();
      const controller = new AbortController();
      controllers.add(controller);
      const result = (async () => {
        await options.assertReadyAsync();
        controller.signal.throwIfAborted();
        return callback({ signal: controller.signal, clock: options.clock });
      })();
      const settled = result.then(
        () => undefined,
        () => undefined,
      );
      runs.add(settled);
      void settled.then(() => {
        runs.delete(settled);
        controllers.delete(controller);
      });
      return result;
    },
    getState: () => state,
    getKeys: () => [...jobs.keys()],
    getAllAsync: () =>
      serialize(async () => {
        assertAccepting();
        const stored = await options.configuration.getAllAsync();
        return [...jobs.values()]
          .filter((job) => !job.hidden)
          .map((job) => {
            const configuration = stored.find((entry) => entry.name === job.name);
            return {
              name: job.name,
              cron: configuration?.cronExpression ?? job.cronExpression,
              preventManualExecution: job.preventManualExecution,
              preventCustomInterval: job.preventCustomInterval,
              isEnabled: configuration?.isEnabled ?? true,
            };
          });
      }),
    startAsync: (name: TName) => serialize(() => startJobAsync(getJob(name))),
    startAllAsync: () =>
      serialize(async () => {
        assertAccepting();
        state = "starting";
        try {
          for (const job of jobs.values()) {
            if (isDraining()) return;
            await startJobAsync(job);
          }
          if (!isDraining()) state = "running";
        } catch (error) {
          for (const task of tasks.values()) task.pause();
          if (!isDraining()) state = "failed";
          throw error;
        }
      }),
    triggerAsync: async (name: TName) => {
      assertAccepting();
      const job = getJob(name);
      if (job.preventManualExecution) throw new Error(`The job "${name}" can not be executed manually.`);
      if (!tasks.has(name)) return;
      await executeAsync(job);
    },
    stop: (name: TName) => {
      assertAccepting();
      getJob(name);
      tasks.get(name)?.pause();
    },
    disableAsync: (name: TName) =>
      serialize(async () => {
        await updateConfigurationAsync(name, { isEnabled: false });
        tasks.get(name)?.pause();
      }),
    enableAsync: (name: TName) =>
      serialize(async () => {
        await updateConfigurationAsync(name, { isEnabled: true });
        await startJobAsync(getJob(name));
      }),
    updateIntervalAsync: (name: TName, expression: string) =>
      serialize(async () => {
        assertAccepting();
        const job = getJob(name);
        if (job.preventCustomInterval && expression !== job.cronExpression) {
          throw new Error(`Custom cron expressions are not allowed for job ${name}`);
        }
        scheduler.validate(expression, job.timezone);
        const configuration = await updateConfigurationAsync(name, { cronExpression: expression });
        const task = createTask(job, configuration);
        tasks.get(name)?.stop();
        tasks.set(name, task);
        if (configuration.isEnabled && state !== "draining") task.resume();
      }),
    stopAsync: (): Promise<void> => {
      if (stopping) return stopping;
      state = "draining";
      for (const task of tasks.values()) task.stop();
      for (const controller of controllers) controller.abort(new Error("Cron jobs are stopping"));
      stopping = (async () => {
        await controls;
        for (const task of tasks.values()) task.stop();
        await Promise.allSettled(runs);
        tasks.clear();
        state = "stopped";
      })();
      return stopping;
    },
  };
};
