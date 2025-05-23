import { AxiosError } from "axios";
import cron from "node-cron";

import { Stopwatch } from "@homarr/common";
import type { MaybePromise } from "@homarr/common/types";

import type { Logger } from "./logger";
import type { ValidateCron } from "./validation";

export interface CreateCronJobCreatorOptions<TAllowedNames extends string> {
  beforeCallback?: (name: TAllowedNames) => MaybePromise<void>;
  onCallbackSuccess?: (name: TAllowedNames) => MaybePromise<void>;
  onCallbackError?: (name: TAllowedNames, error: unknown) => MaybePromise<void>;
  timezone?: string;
  logger: Logger;
}

interface CreateCronJobOptions {
  runOnStart?: boolean;
  expectedMaximumDurationInMillis?: number;
  beforeStart?: () => MaybePromise<void>;
}

const createCallback = <TAllowedNames extends string, TName extends TAllowedNames>(
  name: TName,
  cronExpression: string,
  options: CreateCronJobOptions,
  creatorOptions: CreateCronJobCreatorOptions<TAllowedNames>,
) => {
  const expectedMaximumDurationInMillis = options.expectedMaximumDurationInMillis ?? 2500;
  return (callback: () => MaybePromise<void>) => {
    const catchingCallbackAsync = async () => {
      try {
        creatorOptions.logger.logDebug(`The callback of '${name}' cron job started`);
        const stopwatch = new Stopwatch();
        await creatorOptions.beforeCallback?.(name);
        const beforeCallbackTook = stopwatch.getElapsedInHumanWords();
        await callback();
        const callbackTook = stopwatch.getElapsedInHumanWords();
        creatorOptions.logger.logDebug(
          `The callback of '${name}' cron job succeeded (before callback took ${beforeCallbackTook}, callback took ${callbackTook})`,
        );

        const durationInMillis = stopwatch.getElapsedInMilliseconds();
        if (durationInMillis > expectedMaximumDurationInMillis) {
          creatorOptions.logger.logWarning(
            `The callback of '${name}' succeeded but took ${(durationInMillis - expectedMaximumDurationInMillis).toFixed(2)}ms longer than expected (${expectedMaximumDurationInMillis}ms). This may indicate that your network performance, host performance or something else is too slow. If this happens too often, it should be looked into.`,
          );
        }
        await creatorOptions.onCallbackSuccess?.(name);
      } catch (error) {
        // Log AxiosError in a less detailed way to prevent very long output
        if (error instanceof AxiosError) {
          creatorOptions.logger.logError(
            `Failed to run job '${name}': [AxiosError] ${error.message} ${error.response?.status} ${error.response?.config.url}\n${error.stack}`,
          );
        } else {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          creatorOptions.logger.logError(`Failed to run job '${name}': ${error}`);
        }
        await creatorOptions.onCallbackError?.(name, error);
      }
    };

    /**
     * We are not using the runOnInit method as we want to run the job only once we start the cron job schedule manually.
     * This allows us to always run it once we start it. Additionally it will not run the callback if only the cron job file is imported.
     */
    let scheduledTask: cron.ScheduledTask | null = null;
    if (cronExpression !== "never") {
      scheduledTask = cron.schedule(cronExpression, () => void catchingCallbackAsync(), {
        scheduled: false,
        name,
        timezone: creatorOptions.timezone,
      });
      creatorOptions.logger.logDebug(
        `The cron job '${name}' was created with expression ${cronExpression} in timezone ${creatorOptions.timezone} and runOnStart ${options.runOnStart}`,
      );
    }

    return {
      name,
      cronExpression,
      scheduledTask,
      async onStartAsync() {
        if (options.beforeStart) {
          creatorOptions.logger.logDebug(`Running beforeStart for job: ${name}`);
          await options.beforeStart();
        }

        if (!options.runOnStart) return;

        creatorOptions.logger.logDebug(`The cron job '${name}' is running because runOnStart is set to true`);
        await catchingCallbackAsync();
      },
    };
  };
};

export type JobCallback<TAllowedNames extends string, TName extends TAllowedNames> = ReturnType<
  typeof createCallback<TAllowedNames, TName>
>;

export const createCronJobCreator = <TAllowedNames extends string = string>(
  creatorOptions: CreateCronJobCreatorOptions<TAllowedNames>,
) => {
  return <TName extends TAllowedNames, TExpression extends string>(
    name: TName,
    cronExpression: TExpression,
    options: CreateCronJobOptions = { runOnStart: false },
  ) => {
    creatorOptions.logger.logDebug(`Validating cron expression '${cronExpression}' for job: ${name}`);
    if (cronExpression !== "never" && !cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression '${cronExpression}' for job '${name}'`);
    }
    creatorOptions.logger.logDebug(`Cron job expression '${cronExpression}' for job ${name} is valid`);

    const returnValue = {
      withCallback: createCallback<TAllowedNames, TName>(name, cronExpression, options, creatorOptions),
    };

    // This is a type guard to check if the cron expression is valid and give the user a type hint
    return returnValue as unknown as ValidateCron<TExpression> extends true
      ? typeof returnValue
      : TExpression extends "never"
        ? typeof returnValue
        : "Invalid cron expression";
  };
};
