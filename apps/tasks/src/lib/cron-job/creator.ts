import cron from "node-cron";

import type { MaybePromise } from "@homarr/common/types";
import { logger } from "@homarr/log";

interface CreateCronJobOptions {
  runOnStart?: boolean;
}

export const createCronJob = (cronExpression: string, options: CreateCronJobOptions = { runOnStart: false }) => {
  return {
    withCallback: (callback: () => MaybePromise<void>) => {
      const catchingCallbackAsync = async () => {
        try {
          await callback();
        } catch (error) {
          logger.error(error);
        }
      };

      if (options.runOnStart) {
        void catchingCallbackAsync();
      }

      const task = cron.schedule(cronExpression, () => void catchingCallbackAsync(), {
        scheduled: false,
      });
      return {
        _expression: cronExpression,
        _task: task,
      };
    },
  };
};
