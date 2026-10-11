import { createSubPubChannel } from "@homarr/redis";

export interface TaskStatus {
  name: string;
  status: "running" | "idle";
  lastExecutionTimestamp: string;
  lastExecutionStatus: "success" | "error" | null;
}

export const createCronJobStatusChannel = (name: string) => createSubPubChannel<TaskStatus>(`cron-job-status:${name}`);
