import { observable } from "@trpc/server/observable";

import { objectEntries } from "@homarr/common";
import { cronJobNames, cronJobs, jobNameSchema, triggerCronJobAsync } from "@homarr/cron-job-runner";
import type { TaskStatus } from "@homarr/cron-job-status";
import { createCronJobStatusChannel } from "@homarr/cron-job-status";
import { logger } from "@homarr/log";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const cronJobsRouter = createTRPCRouter({
  triggerJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await triggerCronJobAsync(input);
    }),
  getJobs: permissionRequiredProcedure.requiresPermission("admin").query(() => {
    return objectEntries(cronJobs).map(([name, options]) => ({
      name,
      preventManualExecution: options.preventManualExecution,
    }));
  }),
  subscribeToStatusUpdates: permissionRequiredProcedure.requiresPermission("admin").subscription(() => {
    return observable<TaskStatus>((emit) => {
      const unsubscribes: (() => void)[] = [];

      for (const name of cronJobNames) {
        const channel = createCronJobStatusChannel(name);
        const unsubscribe = channel.subscribe((data) => {
          emit.next(data);
        });
        unsubscribes.push(unsubscribe);
      }

      logger.info("A tRPC client has connected to the cron job status updates procedure");

      return () => {
        unsubscribes.forEach((unsubscribe) => {
          unsubscribe();
        });
      };
    });
  }),
});
