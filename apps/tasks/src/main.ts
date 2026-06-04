// This import has to be the first import in the file so that the agent is overridden before any other modules are imported.
import "./overrides";

import { jobGroup } from "@homarr/cron-jobs";

import { onStartAsync } from "./on-start";

void (async () => {
  await onStartAsync();
  await jobGroup.initializeAsync();
  await jobGroup.startAllAsync();
})();
