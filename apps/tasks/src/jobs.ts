import { iconsUpdaterJob } from "~/jobs/icons-updater";
import { analyticsJob } from "./jobs/analytics";
import { queuesJob } from "./jobs/queue";
import { createJobGroup } from "./lib/cron-job/group";

export const jobs = createJobGroup({
  // Add your jobs here:

  // This job is used to process queues.
  queues: queuesJob,
  iconsUpdater: iconsUpdaterJob,
  analytics: analyticsJob,
});
