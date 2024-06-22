import { createCronJobFunctions } from "@homarr/cron-jobs-core";
import type { Logger } from "@homarr/cron-jobs-core/logger";
import { logger } from "@homarr/log";

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
}

export const { createCronJob, createCronJobGroup } = createCronJobFunctions({
  logger: new WinstonCronJobLogger(),
});
