import { observable } from "@trpc/server/observable";

import { jobNameSchema, triggerCronJobAsync } from "@homarr/cron-job-runner";
import { jobGroup } from "@homarr/cron-jobs";
import { logger } from "@homarr/log";

import type { TaskStatus } from "../../../cron-job-status/src";
import { createCronJobStatusChannel } from "../../../cron-job-status/src";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const cronJobsRouter = createTRPCRouter({
  triggerJob: publicProcedure.input(jobNameSchema).mutation(async ({ input }) => {
    await triggerCronJobAsync(input);
  }),
  getJobs: publicProcedure.query(() => {
    const registry = jobGroup.getJobRegistry();
    return [...registry.values()].map((job) => ({
      name: job.name,
      expression: job.cronExpression,
    }));
  }),
  subscribeToStatusUpdates: publicProcedure.subscription(() => {
    return observable<TaskStatus>((emit) => {
      for (const job of jobGroup.getJobRegistry().values()) {
        const channel = createCronJobStatusChannel(job.name);
        channel.subscribe((data) => {
          emit.next(data);
        });
      }

      logger.info("A tRPC client has connected to the cron job status updates procedure");
    });
  }),
});
