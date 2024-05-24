import cron from "node-cron";

import type { MaybePromise } from "@homarr/common/types";

interface CreateCronJobOptions {
  runOnStart?: boolean;
}

export const createCronJob = (cronExpression: string, options: CreateCronJobOptions = { runOnStart: false }) => {
  return {
    withCallback: (callback: () => MaybePromise<void>) => {
      if (options.runOnStart) {
        void callback();
      }

      const task = cron.schedule(cronExpression, () => void callback(), {
        scheduled: false,
      });
      return {
        _expression: cronExpression,
        _task: task,
      };
    },
  };
};
