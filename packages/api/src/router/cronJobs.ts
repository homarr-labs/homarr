import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import type { JobGroupKeys } from "@homarr/cron-jobs";
import { jobGroup } from "@homarr/cron-jobs";
import { cronExpressionSchema } from "@homarr/cron-job-api";

const jobNameSchema = z.enum(jobGroup.getKeys());

export const cronJobsRouter = createTRPCRouter({
  start: protectedProcedure
    .meta({ requiredPermission: "admin" })
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      // Use the job manager from context
      await ctx.jobManager.startAsync(input);
    }),
  trigger: protectedProcedure
    .meta({ requiredPermission: "admin" })
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.jobManager.triggerAsync(input);
    }),
  stop: protectedProcedure
    .meta({ requiredPermission: "admin" })
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.jobManager.stopAsync(input);
    }),
  updateInterval: protectedProcedure
    .meta({ requiredPermission: "admin" })
    .input(
      z.object({
        name: jobNameSchema,
        cron: cronExpressionSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await ctx.jobManager.updateIntervalAsync(input.name, input.cron);
    }),
  disable: protectedProcedure
    .meta({ requiredPermission: "admin" })
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.jobManager.disableAsync(input);
    }),
  enable: protectedProcedure
    .meta({ requiredPermission: "admin" })
    .input(jobNameSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.jobManager.enableAsync(input);
    }),
  getAll: protectedProcedure
    .meta({ requiredPermission: "admin" })
    .query(async ({ ctx }) => {
      return ctx.jobManager.getAllAsync();
    }),
});