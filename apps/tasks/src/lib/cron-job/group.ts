import { objectEntries } from "@homarr/common";

import type { createCronJob } from "./creator";
import { jobRegistry } from "./registry";

type Jobs = Record<
  string,
  ReturnType<ReturnType<typeof createCronJob>["withCallback"]>
>;

export const createJobGroup = <TJobs extends Jobs>(jobs: TJobs) => {
  for (const [name, job] of objectEntries(jobs)) {
    if (typeof name !== "string") continue;
    jobRegistry.set(name, {
      name,
      expression: job._expression,
      active: false,
      task: job._task,
    });
  }

  return {
    start: (name: keyof TJobs) => {
      const job = jobRegistry.get(name as string);
      if (!job) return;
      job.active = true;
      job.task.start();
    },
    startAll: () => {
      for (const job of jobRegistry.values()) {
        job.active = true;
        job.task.start();
      }
    },
    stop: (name: keyof TJobs) => {
      const job = jobRegistry.get(name as string);
      if (!job) return;
      job.active = false;
      job.task.stop();
    },
    stopAll: () => {
      for (const job of jobRegistry.values()) {
        job.active = false;
        job.task.stop();
      }
    },
  };
};
