// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "./undici-log-agent-override";

import { registerCronJobRunner } from "@homarr/cron-job-runner";
import { jobGroup } from "@homarr/cron-jobs";

import { seedServerSettingsAsync } from "./seed-server-settings";

void (async () => {
  registerCronJobRunner();
  await jobGroup.startAllAsync();
  await seedServerSettingsAsync();
})();
