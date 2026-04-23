export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setGlobalDispatcher } = await import("undici");
    const { UndiciHttpAgent } = await import("@homarr/core/infrastructure/http");
    setGlobalDispatcher(new UndiciHttpAgent());

    const { cleanupSessionsAsync } = await import("./on-start/session-cleanup");
    const { invalidateUpdateCheckerCacheAsync } = await import("./on-start/invalidate-update-checker-cache");
    await cleanupSessionsAsync();
    await invalidateUpdateCheckerCacheAsync();

    const { jobGroup } = await import("@homarr/cron-jobs");
    await jobGroup.initializeAsync();
    await jobGroup.startAllAsync();
  }
}
