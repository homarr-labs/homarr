import { schedule, validate as validateCron } from "node-cron";

import type { IJobManager } from "@homarr/cron-job-api";
import type { jobGroup as cronJobGroup, JobGroupKeys } from "@homarr/cron-jobs";
import type { Database, InferInsertModel } from "@homarr/db";
import { eq } from "@homarr/db";
import { cronJobConfigurations } from "@homarr/db/schema";
import { logger } from "@homarr/log";

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
    logger.info(`Updating cron job interval name="${name}" expression="${cron}"`);
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);
    if (job.cronExpression === "never") throw new Error(`Job ${name} cannot be updated as it is set to "never"`);
    if (!validateCron(cron)) {
      throw new Error(`Invalid cron expression: ${cron}`);
    }
    await this.updateConfigurationAsync(name, { cronExpression: cron });
    await this.jobGroup.getTask(name)?.destroy();

    this.jobGroup.setTask(
      name,
      schedule(cron, () => void job.executeAsync(), {
        name,
      }),
    );
    logger.info(`Cron job interval updated name="${name}" expression="${cron}"`);
  }
  public async disableAsync(name: JobGroupKeys): Promise<void> {
    logger.info(`Disabling cron job name="${name}"`);
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);
    if (job.cronExpression === "never") throw new Error(`Job ${name} cannot be disabled as it is set to "never"`);

    await this.updateConfigurationAsync(name, { isEnabled: false });
    await this.jobGroup.stopAsync(name);
    logger.info(`Cron job disabled name="${name}"`);
  }
  public async enableAsync(name: JobGroupKeys): Promise<void> {
    logger.info(`Enabling cron job name="${name}"`);
    await this.updateConfigurationAsync(name, { isEnabled: true });
    await this.jobGroup.startAsync(name);
    logger.info(`Cron job enabled name="${name}"`);
  }

  private async updateConfigurationAsync(
    name: JobGroupKeys,
    configuration: Omit<Partial<InferInsertModel<typeof cronJobConfigurations>>, "name">,
  ) {
    const existingConfig = await this.db.query.cronJobConfigurations.findFirst({
      where: (table, { eq }) => eq(table.name, name),
    });

    logger.debug(
      `Updating cron job configuration name="${name}" configuration="${JSON.stringify(configuration)}" exists="${Boolean(existingConfig)}"`,
    );

    if (existingConfig) {
      await this.db
        .update(cronJobConfigurations)
        // prevent updating the name, as it is the primary key
        .set({ ...configuration, name: undefined })
        .where(eq(cronJobConfigurations.name, name));
      logger.debug(`Cron job configuration updated name="${name}" configuration="${JSON.stringify(configuration)}"`);
      return;
    }

    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    await this.db
      .insert(cronJobConfigurations)
      .values({ name, cronExpression: job.cronExpression, isEnabled: job.cronExpression !== "never" });
    logger.debug(`Cron job configuration updated name="${name}" configuration="${JSON.stringify(configuration)}"`);
  }

  public async getAllAsync(): Promise<
    { name: JobGroupKeys; cron: string; preventManualExecution: boolean; isEnabled: boolean }[]
  > {
    const configurations = await this.db.query.cronJobConfigurations.findMany();

    return [...this.jobGroup.getJobRegistry().entries()].map(([name, job]) => {
      const config = configurations.find((config) => config.name === name);
      return {
        name,
        cron: config?.cronExpression ?? job.cronExpression,
        preventManualExecution: job.preventManualExecution,
        isEnabled: config?.isEnabled ?? true,
      };
    });
  }
}
