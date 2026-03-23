import { JobManager } from "@homarr/job-scheduler";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";

let jobManagerInstance: JobManager | null = null;

export function getJobManager(): JobManager {
  if (!jobManagerInstance) {
    jobManagerInstance = new JobManager(db, jobGroup);
  }
  return jobManagerInstance;
}

export async function initializeJobManager(): Promise<void> {
  const manager = getJobManager();
  await jobGroup.initializeAsync();
}