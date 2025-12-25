import { observable } from "@trpc/server/observable";
import { schedule, validate as validateCron } from "node-cron";
import z from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { cronExpressionSchema, jobGroupKeys, jobNameSchema } from "@homarr/cron-job-api";
import type { TaskStatus } from "@homarr/cron-job-status";
import { createCronJobStatusChannel } from "@homarr/cron-job-status";
import type { JobGroupKeys } from "@homarr/cron-jobs";
import { jobGroup } from "@homarr/cron-jobs";
import type { Database, InferInsertModel } from "@homarr/db";
import { db, eq } from "@homarr/db";
import { cronJobConfigurations } from "@homarr/db/schema";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

const logger = createLogger({ module: "cronJobsRouter" });

export const cronJobsRouter = createTRPCRouter({
  triggerJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await jobGroup.runManuallyAsync(input);
    }),
  startJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await jobGroup.startAsync(input);
    }),
  stopJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      await jobGroup.stopAsync(input);
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
      logger.info("Updating cron job interval", { name: input.name, expression: input.cron });
      const job = jobGroup.getJobRegistry().get(input.name);
      if (!job) throw new Error(`Job ${input.name} not found`);
      if (!validateCron(input.cron)) {
        throw new Error(`Invalid cron expression: ${input.cron}`);
      }
      await updateConfigurationAsync(db, input.name, { cronExpression: input.cron });
      await jobGroup.getTask(input.name)?.destroy();

      jobGroup.setTask(
        input.name,
        schedule(input.cron, () => void job.executeAsync(), {
          name: input.name,
        }),
      );
      logger.info("Cron job interval updated", { name: input.name, expression: input.cron });
    }),
  disableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      logger.info("Disabling cron job", { name: input });
      const job = jobGroup.getJobRegistry().get(input);
      if (!job) throw new Error(`Job ${input} not found`);

      await updateConfigurationAsync(db, input, { isEnabled: false });
      await jobGroup.stopAsync(input);
      logger.info("Cron job disabled", { name: input });
    }),
  enableJob: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(jobNameSchema)
    .mutation(async ({ input }) => {
      logger.info("Enabling cron job", { name });
      await updateConfigurationAsync(db, input, { isEnabled: true });
      await jobGroup.startAsync(input);
      logger.info("Cron job enabled", { name: input });
    }),
  getJobs: permissionRequiredProcedure.requiresPermission("admin").query(async () => {
    const configurations = await db.query.cronJobConfigurations.findMany();

    return [...jobGroup.getJobRegistry().entries()].map(([name, job]) => {
      const config = configurations.find((config) => config.name === name);
      return {
        name,
        cron: config?.cronExpression ?? job.cronExpression,
        preventManualExecution: job.preventManualExecution,
        isEnabled: config?.isEnabled ?? true,
      };
    });
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

const updateConfigurationAsync = async (
  db: Database,
  name: JobGroupKeys,
  configuration: Omit<Partial<InferInsertModel<typeof cronJobConfigurations>>, "name">,
) => {
  const existingConfig = await db.query.cronJobConfigurations.findFirst({
    where: (table, { eq }) => eq(table.name, name),
  });

  logger.debug("Updating cron job configuration", {
    name,
    configuration: JSON.stringify(configuration),
    exists: Boolean(existingConfig),
  });

  if (existingConfig) {
    await db
      .update(cronJobConfigurations)
      // prevent updating the name, as it is the primary key
      .set({ ...configuration, name: undefined })
      .where(eq(cronJobConfigurations.name, name));
    logger.debug("Cron job configuration updated", {
      name,
      configuration: JSON.stringify(configuration),
    });
    return;
  }

  const job = jobGroup.getJobRegistry().get(name);
  if (!job) throw new Error(`Job ${name} not found`);

  await db.insert(cronJobConfigurations).values({
    name,
    cronExpression: configuration.cronExpression ?? job.cronExpression,
    isEnabled: configuration.isEnabled ?? true,
  });
  logger.debug("Cron job configuration updated", {
    name,
    configuration: JSON.stringify(configuration),
  });
};
