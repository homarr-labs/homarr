import type { ILogger } from "@homarr/core/infrastructure/logs";
import type { createJobStatusRuntime } from "@homarr/cron-job-status/runtime";
import type { HomarrJobsRuntime } from "@homarr/cron-jobs/runtime";

import type { BackendContext } from "../../context";

export type CronJobsStatusRuntime = ReturnType<typeof createJobStatusRuntime>;

export interface CronJobsProcedureResources {
  readonly jobs: HomarrJobsRuntime;
  readonly status: CronJobsStatusRuntime;
  readonly logger: Pick<ILogger, "info">;
  assertCurrentAdminAsync(context: BackendContext): Promise<void>;
}
