import type { CreateCronJobCreatorOptions } from "./creator";
import { createCronJobCreator } from "./creator";
import { createJobGroupCreator } from "./group";
import { ConsoleLogger } from "./logger";

export const createCronJobFunctions = <TAllowedNames extends string>(
  options: CreateCronJobCreatorOptions<TAllowedNames> = { logger: new ConsoleLogger() },
) => {
  return {
    createCronJob: createCronJobCreator<TAllowedNames>(options),
    createCronJobGroup: createJobGroupCreator<TAllowedNames>({
      logger: options.logger,
    }),
  };
};
