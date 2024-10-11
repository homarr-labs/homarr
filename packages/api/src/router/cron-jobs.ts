import { observable } from "@trpc/server/observable";

import { jobNameSchema, triggerCronJobAsync } from "@homarr/cron-job-runner";
import type { TaskStatus } from "@homarr/cron-job-status";
import { createCronJobStatusChannel } from "@homarr/cron-job-status";
import { jobGroup } from "@homarr/cron-jobs";
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
    const registry = jobGroup.getJobRegistry();
    return [...registry.values()].map((job) => ({
      name: job.name,
      expression: job.cronExpression,
    }));
  }),
  subscribeToStatusUpdates: permissionRequiredProcedure.requiresPermission("admin").subscription(() => {
    return observable<TaskStatus>((emit) => {
      const unsubscribes: (() => void)[] = [];

      for (const job of jobGroup.getJobRegistry().values()) {
        const channel = createCronJobStatusChannel(job.name);
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
