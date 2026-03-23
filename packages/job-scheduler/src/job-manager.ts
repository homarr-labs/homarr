import { parseExpression } from "cron-parser";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { IJobManager } from "@homarr/cron-job-api";
import type { jobGroup as cronJobGroup, JobGroupKeys } from "@homarr/cron-jobs";
import type { Database, InferInsertModel } from "@homarr/db";
import { eq } from "@homarr/db";
import { cronJobConfigurations } from "@homarr/db/schema";

const logger = createLogger({ module: "jobManager" });

export class JobManager implements IJobManager {
  private runningJobs = new Set<string>();

  constructor(
    private db: Database,
    private jobGroup: typeof cronJobGroup,
  ) {}

  public async startAsync(name: JobGroupKeys): Promise<void> {
    // In the new system, start just means enable
    await this.enableAsync(name);
  }

  public async triggerAsync(name: JobGroupKeys): Promise<void> {
    await this.jobGroup.runManuallyAsync(name);
  }

  public async stopAsync(name: JobGroupKeys): Promise<void> {
    // In the new system, stop means disable
    await this.disableAsync(name);
  }

  public async updateIntervalAsync(name: JobGroupKeys, cron: string): Promise<void> {
    logger.info("Updating cron job interval", { name, expression: cron });
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    // Validate cron expression
    try {
      parseExpression(cron);
    } catch {
      throw new Error(`Invalid cron expression: ${cron}`);
    }

    if (job.preventCustomInterval && cron !== job.cronExpression) {
      throw new Error(`Custom cron expressions are not allowed for job ${name}`);
    }

    await this.updateConfigurationAsync(name, { cronExpression: cron });
    logger.info("Cron job interval updated", { name, expression: cron });
  }

  public async disableAsync(name: JobGroupKeys): Promise<void> {
    logger.info("Disabling cron job", { name });
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    await this.updateConfigurationAsync(name, { isEnabled: false });
    logger.info("Cron job disabled", { name });
  }

  public async enableAsync(name: JobGroupKeys): Promise<void> {
    logger.info("Enabling cron job", { name });
    await this.updateConfigurationAsync(name, { isEnabled: true });
    logger.info("Cron job enabled", { name });
  }

  // New method to trigger jobs based on current time
  public async triggerJobsAsync(): Promise<void> {
    const jobs = await this.getAllAsync();
    const now = new Date();

    for (const jobInfo of jobs) {
      if (!jobInfo.isEnabled) continue;
      if (this.runningJobs.has(jobInfo.name)) continue; // Prevent parallel execution

      try {
        const cronExpression = jobInfo.cron;
        const interval = parseExpression(cronExpression);
        const nextRun = interval.next();
        const prevRun = interval.prev();

        // Check if current time matches the cron (within a small tolerance)
        const timeDiff = Math.abs(now.getTime() - nextRun.getTime());
        if (timeDiff < 1000) { // Within 1 second
          await this.executeJobAsync(jobInfo.name);
        }
      } catch (error) {
        logger.error("Error checking job schedule", { name: jobInfo.name, error });
      }
    }
  }

  private async executeJobAsync(name: string): Promise<void> {
    if (this.runningJobs.has(name)) return;

    this.runningJobs.add(name);
    try {
      logger.info("Executing scheduled job", { name });
      await this.jobGroup.runManuallyAsync(name as JobGroupKeys);
      logger.info("Job executed successfully", { name });
    } catch (error) {
      logger.error("Job execution failed", { name, error });
    } finally {
      this.runningJobs.delete(name);
    }
  }

  private async updateConfigurationAsync(
    name: JobGroupKeys,
    configuration: Omit<Partial<InferInsertModel<typeof cronJobConfigurations>>, "name">,
  ) {
    const existingConfig = await this.db.query.cronJobConfigurations.findFirst({
      where: (table, { eq }) => eq(table.name, name),
    });

    logger.debug("Updating cron job configuration", {
      name,
      configuration: JSON.stringify(configuration),
      exists: Boolean(existingConfig),
    });

    if (existingConfig) {
      await this.db
        .update(cronJobConfigurations)
        .set({ ...configuration, name: undefined })
        .where(eq(cronJobConfigurations.name, name));
      logger.debug("Cron job configuration updated", {
        name,
        configuration: JSON.stringify(configuration),
      });
      return;
    }

    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    await this.db.insert(cronJobConfigurations).values({
      name,
      cronExpression: configuration.cronExpression ?? job.cronExpression,
      isEnabled: configuration.isEnabled ?? true,
    });
    logger.debug("Cron job configuration created", {
      name,
      configuration: JSON.stringify(configuration),
    });
  }

  public async getAllAsync(): Promise<
    {
      name: JobGroupKeys;
      cron: string;
      preventManualExecution: boolean;
      preventCustomInterval: boolean;
      isEnabled: boolean;
    }[]
  > {
    const configurations = await this.db.query.cronJobConfigurations.findMany();

    return [...this.jobGroup.getJobRegistry().entries()].map(([name, job]) => {
      const config = configurations.find((config) => config.name === name);
      return {
        name,
        cron: config?.cronExpression ?? job.cronExpression,
        preventManualExecution: job.preventManualExecution,
        preventCustomInterval: job.preventCustomInterval,
        isEnabled: config?.isEnabled ?? true,
      };
    });
  }
}