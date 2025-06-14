import { initTRPC } from "@trpc/server";
import { z } from "zod/v4";

import type { JobGroupKeys } from "@homarr/cron-jobs";
import { jobGroup } from "@homarr/cron-jobs";

const jobNameSchema = z.enum(jobGroup.getKeys());

export interface IJobManager {
  startAsync(name: JobGroupKeys): Promise<void>;
  triggerAsync(name: JobGroupKeys): Promise<void>;
  stopAsync(name: JobGroupKeys): Promise<void>;
  updateIntervalAsync(name: JobGroupKeys, cron: string): Promise<void>;
  disableAsync(name: JobGroupKeys): Promise<void>;
  enableAsync(name: JobGroupKeys): Promise<void>;
  getInfoAsync(name: JobGroupKeys): Promise<{
    name: JobGroupKeys;
    cron: string;
    isRunning: boolean;
    nextRun: Date | null;
  }>;
}

const t = initTRPC
  .context<{
    manager: IJobManager;
  }>()
  .create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const jobRouter = router({
  start: publicProcedure.input(jobNameSchema).mutation(async ({ input, ctx }) => {
    await ctx.manager.startAsync(input);
  }),
  trigger: publicProcedure.input(jobNameSchema).mutation(async ({ input, ctx }) => {
    await ctx.manager.triggerAsync(input);
  }),
  stop: publicProcedure.input(jobNameSchema).mutation(async ({ input, ctx }) => {
    await ctx.manager.stopAsync(input);
  }),
  updateInterval: publicProcedure
    .input(z.object({ name: jobNameSchema, cron: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.manager.updateIntervalAsync(input.name, input.cron);
    }),
  disable: publicProcedure.input(jobNameSchema).mutation(async ({ input, ctx }) => {
    await ctx.manager.disableAsync(input);
  }),
  enable: publicProcedure.input(jobNameSchema).mutation(async ({ input, ctx }) => {
    await ctx.manager.enableAsync(input);
  }),
  getInfo: publicProcedure.input(jobNameSchema).query(async ({ input, ctx }) => {
    return ctx.manager.getInfoAsync(input);
  }),
});

export type JobRouter = typeof jobRouter;
