import type { createCronJobRuntime } from "@homarr/cron-jobs/runtime";

let initialize: Promise<void> | undefined;
let runtime: ReturnType<typeof createCronJobRuntime> | undefined;
let stopped = false;

/** Load operational jobs only when an authenticated client starts using domain APIs. */
export function initializeWorkerServices() {
  if (stopped) return Promise.resolve();
  initialize ??= (async () => {
    const { createCronJobRuntime } = await import("@homarr/cron-jobs/runtime");
    if (stopped) return;
    runtime ??= createCronJobRuntime();
    await runtime.startWorkerAsync({ runOptionalJobs: process.env.WORKER_RUN_OPTIONAL_JOBS === "true" });
  })().catch((error: unknown) => {
    initialize = undefined;
    throw error;
  });
  return initialize;
}

export function stopWorkerServices() {
  stopped = true;
  runtime?.stop();
}
