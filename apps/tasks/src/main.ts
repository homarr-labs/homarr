// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "./undici-log-agent-override";

import { registerCronJobRunner } from "@homarr/cron-job-runner/register";
import { jobGroup } from "@homarr/cron-jobs";

void (async () => {
  registerCronJobRunner();
  await jobGroup.startAllAsync();
})();
