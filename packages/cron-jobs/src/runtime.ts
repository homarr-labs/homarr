import { jobGroup } from "./index";
import type { JobGroupKeys } from "./index";

/** Owns one process lifetime; stop prevents pending startup from reviving schedules. */
export function createCronJobRuntime() {
  let startup: Promise<void> | undefined;
  let stopped = false;

  function begin(startJobs: () => Promise<void>) {
    if (stopped) return Promise.resolve();
    startup ??= (async () => {
      await jobGroup.initializeAsync();
      if (stopped) {
        jobGroup.stopAll();
        return;
      }
      await startJobs();
    })().catch((error: unknown) => {
      startup = undefined;
      throw error;
    });
    return startup;
  }

  async function startJob(name: JobGroupKeys) {
    try {
      await jobGroup.startAsync(name);
    } finally {
      // onStartAsync may finish after stop(), and resume its schedule.
      if (stopped) jobGroup.stopAll();
    }
  }

  return {
    /** Eager runtimes wait for each enabled job's startup work before reporting ready. */
    startAsync() {
      return begin(async () => {
        for (const name of jobGroup.getKeys()) {
          if (stopped) break;
          if (!jobGroup.getTask(name)) continue;
          await startJob(name);
        }
      });
    },
    /** Private workers become usable without waiting for optional network-backed work. */
    startWorkerAsync({ runOptionalJobs = false } = {}) {
      return begin(async () => {
        for (const name of jobGroup.getKeys()) {
          if (stopped) break;
          if ((name === "analytics" || name === "iconsUpdater") && !runOptionalJobs) continue;
          void startJob(name).catch(() => console.error("Worker scheduled job failed to start", name));
        }
      });
    },
    stop() {
      stopped = true;
      jobGroup.stopAll();
    },
  };
}
