import type { JobsRuntimeOptions, RuntimeJob } from "@homarr/cron-jobs-core/runtime";
import { createJobsRuntime } from "@homarr/cron-jobs-core/runtime";
import {
  AnalyticsExternalConnectionsDisabledError,
  cleanupDisabledProviderSessionsAsync,
  clearPingUrlsAsync,
  createAnalyticsJobService,
  pingUrlsAsync,
  updateIconsAsync,
} from "./jobs/runtime-bodies";
import type {
  AnalyticsJobResources,
  IconsJobResources,
  PingJobResources,
  SessionCleanupResources,
} from "./jobs/runtime-bodies";

export type HomarrJobName = "analytics" | "iconsUpdater" | "ping";

export interface HomarrJobsResources {
  analytics: AnalyticsJobResources;
  icons: IconsJobResources;
  ping: PingJobResources;
  cleanup: SessionCleanupResources<"credentials" | "oidc" | "ldap">;
}

export const createHomarrJobsRuntime = (
  resources: HomarrJobsResources,
  lifecycle: Omit<JobsRuntimeOptions<HomarrJobName>, "jobs" | "cleanupAsync">,
) => {
  const analytics = createAnalyticsJobService(resources.analytics);
  const defaults = {
    preventManualExecution: false,
    preventCustomInterval: false,
    hidden: false,
    runOnStart: false,
    expectedMaximumDurationInMillis: 2500,
  };
  const jobs: RuntimeJob<HomarrJobName>[] = [
    {
      ...defaults,
      name: "analytics",
      cronExpression: "0 0 * * 1",
      runOnStart: true,
      preventManualExecution: true,
      preventCustomInterval: true,
      hidden: true,
      executeAsync: async ({ signal }) => {
        if (resources.analytics.noExternalConnection()) return;
        const result = await analytics.sendServerAnalyticsAsync(signal);
        if (result === "failed") throw new Error("Analytics job failed");
      },
    },
    {
      ...defaults,
      name: "iconsUpdater",
      cronExpression: "0 0 * * 1",
      runOnStart: true,
      expectedMaximumDurationInMillis: 10 * 1000,
      executeAsync: ({ signal }) => updateIconsAsync(resources.icons, signal),
    },
    {
      ...defaults,
      name: "ping",
      cronExpression: "* * * * *",
      beforeStartAsync: () => clearPingUrlsAsync(resources.ping),
      executeAsync: ({ signal }) => pingUrlsAsync(resources.ping, signal),
    },
  ];
  const runtime = createJobsRuntime({
    ...lifecycle,
    jobs,
    cleanupAsync: () => cleanupDisabledProviderSessionsAsync(resources.cleanup),
  });
  return {
    ...runtime,
    sendServerAnalyticsAsync: () => runtime.runEffectAsync(({ signal }) => analytics.sendServerAnalyticsAsync(signal)),
    sendAnalyticsAsync: () =>
      runtime.runEffectAsync(async ({ signal }) => {
        if (resources.analytics.noExternalConnection()) throw new AnalyticsExternalConnectionsDisabledError();
        return { status: await analytics.sendServerAnalyticsAsync(signal) };
      }),
  };
};

export type HomarrJobsRuntime = ReturnType<typeof createHomarrJobsRuntime>;
