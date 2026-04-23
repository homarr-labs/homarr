import { observable } from "@trpc/server/observable";
import z from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { cronExpressionSchema, jobGroupKeys, jobNameSchema } from "@homarr/cron-job-api";
import { JobManager } from "@homarr/cron-job-api/job-manager";
import type { TaskStatus } from "@homarr/cron-job-status";
import { createCronJobStatusChannel } from "@homarr/cron-job-status";
import { db } from "@homarr/db";
import { jobGroup } from "@homarr/cron-jobs";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

const logger = createLogger({ module: "cronJobsRouter" });
const manager = new JobManager(db, jobGroup);

export const cronJobsRouter = createTRPCRouter({
  triggerJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await manager.triggerAsync(input);
    }),
  startJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await manager.startAsync(input);
    }),
  stopJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await manager.stopAsync(input);
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
      await manager.updateIntervalAsync(input.name, input.cron);
    }),
  disableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await manager.disableAsync(input);
    }),
  enableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await manager.enableAsync(input);
    }),
  getJobs: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    return await manager.getAllAsync();
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
