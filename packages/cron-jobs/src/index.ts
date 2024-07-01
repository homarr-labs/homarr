import { analyticsJob } from "./jobs/analytics";
import { iconsUpdaterJob } from "./jobs/icons-updater";
import { smartHomeEntityStateJob } from "./jobs/integrations/home-assistant";
import { pingJob } from "./jobs/ping";
import { createCronJobGroup } from "./lib";

export const jobGroup = createCronJobGroup({
  analytics: analyticsJob,
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,
  smartHomeEntityState: smartHomeEntityStateJob,
});

export type JobGroupKeys = ReturnType<(typeof jobGroup)["getKeys"]>[number];
