import { schedule, validate as validateCron } from "node-cron";

import type { IJobManager } from "@homarr/cron-job-api";
import type { jobGroup as cronJobGroup, JobGroupKeys } from "@homarr/cron-jobs";
import type { Database, InferInsertModel } from "@homarr/db";
import { eq } from "@homarr/db";
import { cronJobConfigurations } from "@homarr/db/schema";

export class JobManager implements IJobManager {
  constructor(
    private db: Database,
    private jobGroup: typeof cronJobGroup,
  ) {}

  public async startAsync(name: JobGroupKeys): Promise<void> {
    await this.jobGroup.startAsync(name);
  }
  public async triggerAsync(name: JobGroupKeys): Promise<void> {
    await this.jobGroup.runManuallyAsync(name);
  }
  public async stopAsync(name: JobGroupKeys): Promise<void> {
    await this.jobGroup.stopAsync(name);
  }
  public async updateIntervalAsync(name: JobGroupKeys, cron: string): Promise<void> {
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);
    if (job.cronExpression === "never") throw new Error(`Job ${name} cannot be updated as it is set to "never"`);
    if (!validateCron(cron)) {
      throw new Error(`Invalid cron expression: ${cron}`);
    }
    await this.updateConfigurationAsync(name, { cronExpression: cron });
    await job.scheduledTask?.destroy();

    console.log(`Updating cron job ${name} to new cron expression: ${cron}`);

    job.scheduledTask = schedule(cron, () => void job.executeAsync(), {
      name,
    });
  }
  public async disableAsync(name: JobGroupKeys): Promise<void> {
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);
    if (job.cronExpression === "never") throw new Error(`Job ${name} cannot be disabled as it is set to "never"`);

    await this.updateConfigurationAsync(name, { isEnabled: false });
    await this.jobGroup.stopAsync(name);
  }
  public async enableAsync(name: JobGroupKeys): Promise<void> {
    await this.updateConfigurationAsync(name, { isEnabled: true });
    await this.jobGroup.startAsync(name);
  }

  private async updateConfigurationAsync(
    name: JobGroupKeys,
    configuration: Omit<Partial<InferInsertModel<typeof cronJobConfigurations>>, "name">,
  ) {
    const existingConfig = await this.db.query.cronJobConfigurations.findFirst({
      where: (table, { eq }) => eq(table.name, name),
    });

    if (existingConfig) {
      await this.db
        .update(cronJobConfigurations)
        // prevent updating the name, as it is the primary key
        .set({ ...configuration, name: undefined })
        .where(eq(cronJobConfigurations.name, name));
      return;
    }

    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    await this.db
      .insert(cronJobConfigurations)
      .values({ name, cronExpression: job.cronExpression, isEnabled: job.cronExpression !== "never" });
  }

  public async getInfoAsync(
    name: JobGroupKeys,
  ): Promise<{ name: JobGroupKeys; cron: string; isRunning: boolean; nextRun: Date | null }> {
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    const status = await job.scheduledTask?.getStatus();

    return {
      cron: job.cronExpression,
      isRunning: status === "running",
      nextRun: job.scheduledTask?.getNextRun() ?? null,
      name: job.name,
    };
  }
}
