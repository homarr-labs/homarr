import { iconsUpdaterJob } from "~/jobs/icons-updater";
import { smartHomeEntityStateJob } from "~/jobs/integrations/home-assistant";
import { analyticsJob } from "./jobs/analytics";
import { pingJob } from "./jobs/ping";
import { queuesJob } from "./jobs/queue";
import { createJobGroup } from "./lib/cron-job/group";

export const jobs = createJobGroup({
  // Add your jobs here:
  analytics: analyticsJob,
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,
  smartHomeEntityState: smartHomeEntityStateJob,

  // This job is used to process queues.
  queues: queuesJob,
});
