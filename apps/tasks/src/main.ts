// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
// eslint-disable-next-line import/no-unassigned-import
import "./overrides";

import { cleanupSessionsAsync } from "@homarr/auth/session-cleanup";
import { createCronJobRuntime } from "@homarr/cron-jobs/runtime";

const jobs = createCronJobRuntime();

export const startupPromise = (async () => {
  await cleanupSessionsAsync();
  await jobs.startAsync();
})();
