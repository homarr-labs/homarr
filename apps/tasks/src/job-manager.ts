import { Cron } from "croner";

import { createLogger } from "@homarr/core/infrastructure/logs";
import type { IJobManager } from "@homarr/cron-job-api";
import type { jobGroup as cronJobGroup, JobGroupKeys } from "@homarr/cron-jobs";
import type { Database, InferInsertModel } from "@homarr/db";
import { eq } from "@homarr/db";
import { cronJobConfigurations } from "@homarr/db/schema";

const logger = createLogger({ module: "jobManager" });

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
  public stop(name: JobGroupKeys): void {
    this.jobGroup.stop(name);
  }
  public async updateIntervalAsync(name: JobGroupKeys, cron: string): Promise<void> {
    logger.info("Updating cron job interval", { name, expression: cron });
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);
    if (job.preventCustomInterval && cron !== job.cronExpression) {
      throw new Error(`Custom cron expressions are not allowed for job ${name}`);
    }

    const updatedConfig = await this.updateConfigurationAsync(name, { cronExpression: cron });
    this.jobGroup.getTask(name)?.stop();

    this.jobGroup.setTask(
      name,
      new Cron(
        cron,
        {
          name,
          timezone: job.timezone,
          paused: !updatedConfig.isEnabled,
        },
        () => void job.executeAsync(),
      ),
    );
    logger.info("Cron job interval updated", { name, expression: cron });
  }
  public async disableAsync(name: JobGroupKeys): Promise<void> {
    logger.info("Disabling cron job", { name });
    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    await this.updateConfigurationAsync(name, { isEnabled: false });
    this.jobGroup.stop(name);
    logger.info("Cron job disabled", { name });
  }
  public async enableAsync(name: JobGroupKeys): Promise<void> {
    logger.info("Enabling cron job", { name });
    await this.updateConfigurationAsync(name, { isEnabled: true });
    await this.jobGroup.startAsync(name);
    logger.info("Cron job enabled", { name });
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
        // prevent updating the name, as it is the primary key
        .set({ ...configuration, name: undefined })
        .where(eq(cronJobConfigurations.name, name));
      logger.debug("Cron job configuration updated", {
        name,
        configuration: JSON.stringify(configuration),
      });
      return {
        name,
        cronExpression: configuration.cronExpression ?? existingConfig.cronExpression,
        isEnabled: configuration.isEnabled ?? existingConfig.isEnabled,
      };
    }

    const job = this.jobGroup.getJobRegistry().get(name);
    if (!job) throw new Error(`Job ${name} not found`);

    const updatedConfig = {
      name,
      cronExpression: configuration.cronExpression ?? job.cronExpression,
      isEnabled: configuration.isEnabled ?? true,
    };
    await this.db.insert(cronJobConfigurations).values(updatedConfig);
    logger.debug("Cron job configuration updated", {
      name,
      configuration: JSON.stringify(configuration),
    });
    return updatedConfig;
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
