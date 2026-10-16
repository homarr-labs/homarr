let initialize: Promise<void> | undefined;
let stop = () => {};

/** Load operational jobs only when an authenticated client starts using domain APIs. */
export function initializeWorkerServices() {
  initialize ??= (async () => {
    const { jobGroup } = await import("@homarr/cron-jobs");
    await jobGroup.initializeAsync();
    stop = () => jobGroup.stopAll();
    // Optional network-backed startup work must not hold the worker API hostage.
    for (const key of jobGroup.getKeys()) {
      // Hosted UI assets and telemetry are optional for a private service worker.
      if ((key === "analytics" || key === "iconsUpdater") && process.env.WORKER_RUN_OPTIONAL_JOBS !== "true") continue;
      void jobGroup.startAsync(key).catch(() => console.error("Worker scheduled job failed to start", key));
    }
  })().catch((error: unknown) => {
    initialize = undefined;
    throw error;
  });
  return initialize;
}

export function stopWorkerServices() {
  stop();
}
