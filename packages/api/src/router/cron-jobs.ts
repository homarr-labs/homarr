import { observable } from "@trpc/server/observable";
import { validate } from "node-cron";
import z from "zod/v4";

import type { TaskStatus } from "@homarr/cron-job-status";
import { createCronJobStatusChannel } from "@homarr/cron-job-status";
import { jobGroup } from "@homarr/cron-jobs";
import { logger } from "@homarr/log";
import { JobManager } from "@homarr/tasks";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const cronExpressionSchema = z.string().refine((expression) => validate(expression), {
  error: "Invalid cron expression",
});

export const jobGroupKeys = jobGroup.getKeys();
export const jobNameSchema = z.enum(jobGroup.getKeys());

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
