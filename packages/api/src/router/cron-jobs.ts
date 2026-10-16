import { observable } from "../subscription";
import z from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { TaskStatus } from "@homarr/cron-job-status";
import { createCronJobStatusChannel } from "@homarr/cron-job-status";
import { jobGroup } from "@homarr/cron-jobs";
import { JobManager } from "@homarr/cron-jobs/job-manager";

import { createApiRouter, permissionRequiredProcedure } from "../procedure";
import { subscriptionEvents } from "../subscription";

const jobGroupKeys = jobGroup.getKeys();
const jobNameSchema = z.enum(jobGroup.getKeys());

const logger = createLogger({ module: "cronJobsRouter" });

export const cronJobsRouter = createApiRouter({
  triggerJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, context }) => {
      await new JobManager(context.db, jobGroup).triggerAsync(input);
    }),
  startJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, context }) => {
      await new JobManager(context.db, jobGroup).startAsync(input);
    }),
  stopJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(({ input, context }) => {
      new JobManager(context.db, jobGroup).stop(input);
    }),
  updateJobInterval: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        name: jobNameSchema,
        cron: z.string(),
      }),
    )
    .mutation(async ({ input, context }) => {
      await new JobManager(context.db, jobGroup).updateIntervalAsync(input.name, input.cron);
    }),
  disableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, context }) => {
      await new JobManager(context.db, jobGroup).disableAsync(input);
    }),
  enableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, context }) => {
      await new JobManager(context.db, jobGroup).enableAsync(input);
    }),
  getJobs: permissionRequiredProcedure.requiresPermission("admin").query(async ({ context }) => {
    return await new JobManager(context.db, jobGroup).getAllAsync();
  }),
  subscribeToStatusUpdates: permissionRequiredProcedure.requiresPermission("admin").subscription(({ signal }) => {
    const events = observable<TaskStatus>((emit) => {
      const unsubscribes: (() => void)[] = [];

      for (const name of jobGroupKeys) {
        const channel = createCronJobStatusChannel(name);
        const unsubscribe = channel.subscribe((data) => {
          emit.next(data);
        });
        unsubscribes.push(unsubscribe);
      }

      logger.info("A oRPC client has connected to the cron job status updates procedure");

      return () => {
        unsubscribes.forEach((unsubscribe) => {
          unsubscribe();
        });
      };
    });
    return subscriptionEvents(events, signal);
  }),
});
