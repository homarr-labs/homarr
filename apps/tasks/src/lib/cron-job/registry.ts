import type cron from "node-cron";

interface Job {
  name: string;
  expression: string;
  active: boolean;
  task: cron.ScheduledTask;
}
export const jobRegistry = new Map<string, Job>();
