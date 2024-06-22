import cron from "node-cron";

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
}

const createCallback = <TAllowedNames extends string, TName extends TAllowedNames>(
  name: TName,
  cronExpression: string,
  options: CreateCronJobOptions,
  creatorOptions: CreateCronJobCreatorOptions<TAllowedNames>,
) => {
  return (callback: () => MaybePromise<void>) => {
    const catchingCallbackAsync = async () => {
      try {
        creatorOptions.logger.logDebug(`The callback of '${name}' cron job started`);
        await creatorOptions.beforeCallback?.(name);
        await callback();
        creatorOptions.logger.logInfo(`The callback of '${name}' cron job succeeded`);
        await creatorOptions.onCallbackSuccess?.(name);
      } catch (error) {
        creatorOptions.logger.logError(error);
        await creatorOptions.onCallbackError?.(name, error);
      }
    };

    const scheduledTask = cron.schedule(cronExpression, () => void catchingCallbackAsync(), {
      scheduled: false,
      name,
      runOnInit: options.runOnStart,
      timezone: creatorOptions.timezone,
    });
    creatorOptions.logger.logDebug(
      `The cron job '${name}' was created with expression ${cronExpression} in timezone ${creatorOptions.timezone} and runOnInit ${options.runOnStart}`,
    );

    return {
      name,
      cronExpression,
      scheduledTask,
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
    if (!cron.validate(cronExpression)) {
      throw new Error("Invalid cron expression for job: " + name);
    }
    creatorOptions.logger.logDebug(`Cron job expression '${cronExpression}' for job ${name} is valid`);

    const returnValue = {
      withCallback: createCallback<TAllowedNames, TName>(name, cronExpression, options, creatorOptions),
    };

    // This is a type guard to check if the cron expression is valid and give the user a type hint
    return returnValue as unknown as ValidateCron<TExpression> extends true
      ? typeof returnValue
      : "Invalid cron expression";
  };
};
