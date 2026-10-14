import z from "zod/v4";

import type { SourceLeafPath } from "../port-map";
import { authenticatedProcedure } from "../procedure";
import { createCronJobsStatusIterator } from "./-cron-jobs/helpers";
import type { CronJobsProcedureResources } from "./-cron-jobs/resources";

export type { CronJobsProcedureResources, CronJobsStatusRuntime } from "./-cron-jobs/resources";

export const cronJobsImplementedPaths = [
  "cronJobs.triggerJob",
  "cronJobs.startJob",
  "cronJobs.stopJob",
  "cronJobs.updateJobInterval",
  "cronJobs.disableJob",
  "cronJobs.enableJob",
  "cronJobs.getJobs",
  "cronJobs.subscribeToStatusUpdates",
] as const satisfies readonly SourceLeafPath[];

export function createCronJobsProcedures(resources: CronJobsProcedureResources) {
  const jobGroupKeys = resources.jobs.getKeys();
  const jobNameSchema = z.enum(jobGroupKeys);

  return {
    triggerJob: authenticatedProcedure({
      path: "cronJobs.triggerJob",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(jobNameSchema)
      .handler(async ({ input }) => {
        await resources.jobs.triggerAsync(input);
      }),
    startJob: authenticatedProcedure({
      path: "cronJobs.startJob",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(jobNameSchema)
      .handler(async ({ input }) => {
        await resources.jobs.startAsync(input);
      }),
    stopJob: authenticatedProcedure({
      path: "cronJobs.stopJob",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(jobNameSchema)
      .handler(({ input }) => {
        resources.jobs.stop(input);
      }),
    updateJobInterval: authenticatedProcedure({
      path: "cronJobs.updateJobInterval",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.object({ name: jobNameSchema, cron: z.string() }))
      .handler(async ({ input }) => {
        resources.logger.info("Updating cron job interval", { name: input.name, expression: input.cron });
        await resources.jobs.updateIntervalAsync(input.name, input.cron);
        resources.logger.info("Cron job interval updated", { name: input.name, expression: input.cron });
      }),
    disableJob: authenticatedProcedure({
      path: "cronJobs.disableJob",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(jobNameSchema)
      .handler(async ({ input }) => {
        resources.logger.info("Disabling cron job", { name: input });
        await resources.jobs.disableAsync(input);
        resources.logger.info("Cron job disabled", { name: input });
      }),
    enableJob: authenticatedProcedure({
      path: "cronJobs.enableJob",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(jobNameSchema)
      .handler(async ({ input }) => {
        resources.logger.info("Enabling cron job", { name: input });
        await resources.jobs.enableAsync(input);
        resources.logger.info("Cron job enabled", { name: input });
      }),
    getJobs: authenticatedProcedure({
      path: "cronJobs.getJobs",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).handler(async ({ context }) => {
      context.signal.throwIfAborted();
      await resources.assertCurrentAdminAsync(context);
      context.signal.throwIfAborted();
      const jobs = await resources.jobs.getAllAsync();
      context.signal.throwIfAborted();
      await resources.assertCurrentAdminAsync(context);
      context.signal.throwIfAborted();
      return jobs;
    }),
    subscribeToStatusUpdates: authenticatedProcedure({
      path: "cronJobs.subscribeToStatusUpdates",
      kind: "subscription",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).handler(({ context }) => createCronJobsStatusIterator(resources, context, jobGroupKeys)),
  };
}
