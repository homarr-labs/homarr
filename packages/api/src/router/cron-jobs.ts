import { observable } from "@trpc/server/observable";
import z from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { cronExpressionSchema, jobGroupKeys, jobNameSchema } from "@homarr/cron-job-api";
import type { TaskStatus } from "@homarr/cron-job-status";
import { createCronJobStatusChannel } from "@homarr/cron-job-status";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";
import { JobManager } from "./cron-jobs/job-manager";

const logger = createLogger({ module: "cronJobsRouter" });
const jobManager = new JobManager(db, jobGroup);

export const cronJobsRouter = createTRPCRouter({
  triggerJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await jobManager.triggerAsync(input);
    }),
  startJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await jobManager.startAsync(input);
    }),
  stopJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await jobManager.stopAsync(input);
    }),
  updateJobInterval: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(
      z.object({
        name: jobNameSchema,
        cron: cronExpressionSchema,
      }),
    )
    .mutation(async ({ input }) => {
      await jobManager.updateIntervalAsync(input.name, input.cron);
    }),
  disableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await jobManager.disableAsync(input);
    }),
  enableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await jobManager.enableAsync(input);
    }),
  getJobs: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    return await jobManager.getAllAsync();
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
