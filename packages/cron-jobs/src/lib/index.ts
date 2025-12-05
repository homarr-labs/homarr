import { createLogger } from "@homarr/core/infrastructure/logs";
import { beforeCallbackAsync, onCallbackErrorAsync, onCallbackSuccessAsync } from "@homarr/cron-job-status/publisher";
import { createCronJobFunctions } from "@homarr/cron-jobs-core";
import type { Logger } from "@homarr/cron-jobs-core/logger";
import type { TranslationObject } from "@homarr/translation";

const logger = createLogger({ module: "cronJobs" });

class WinstonCronJobLogger implements Logger {
  logDebug(message: string) {
    logger.debug(message);
  }

  logInfo(message: string) {
    logger.info(message);
  }

  logError(error: unknown) {
    logger.error(error);
  }

  logWarning(message: string) {
    logger.warn(message);
  }
}

export const { createCronJob, createCronJobGroup } = createCronJobFunctions<
  keyof TranslationObject["management"]["page"]["tool"]["tasks"]["job"]
>({
  logger: new WinstonCronJobLogger(),
  beforeCallback: beforeCallbackAsync,
  onCallbackSuccess: onCallbackSuccessAsync,
  onCallbackError: onCallbackErrorAsync,
});
