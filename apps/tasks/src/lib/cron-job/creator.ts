import cron from "node-cron";

import type { MaybePromise } from "@homarr/common/types";

export const createCronJob = (cronExpression: string) => {
  return {
    withCallback: (callback: () => MaybePromise<void>) => {
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
