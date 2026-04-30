import { observable } from "@trpc/server/observable";
import z from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { TaskStatus } from "@homarr/cron-job-status";
import { createCronJobStatusChannel } from "@homarr/cron-job-status";
import { cronExpressionSchema, jobGroup } from "@homarr/cron-jobs";
import { JobManager } from "@homarr/cron-jobs/job-manager";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

const jobGroupKeys = jobGroup.getKeys();
const jobNameSchema = z.enum(jobGroup.getKeys());

const logger = createLogger({ module: "cronJobsRouter" });

export const cronJobsRouter = createTRPCRouter({
  triggerJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await new JobManager(ctx.db, jobGroup).triggerAsync(input);
    }),
  startJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await new JobManager(ctx.db, jobGroup).startAsync(input);
    }),
  stopJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await new JobManager(ctx.db, jobGroup).stopAsync(input);
    }),
  updateJobInterval: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        name: jobNameSchema,
        cron: cronExpressionSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await new JobManager(ctx.db, jobGroup).updateIntervalAsync(input.name, input.cron);
    }),
  disableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await new JobManager(ctx.db, jobGroup).disableAsync(input);
    }),
  enableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await new JobManager(ctx.db, jobGroup).enableAsync(input);
    }),
  getJobs: permissionRequiredProcedure.requiresPermission("admin").query(async ({ ctx }) => {
    return await new JobManager(ctx.db, jobGroup).getAllAsync();
  }),
  subscribeToStatusUpdates: permissionRequiredProcedure.requiresPermission("admin").subscription(() => {
    return observable<TaskStatus>((emit) => {
      const unsubscribes: (() => void)[] = [];

      for (const name of jobGroupKeys) {
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
