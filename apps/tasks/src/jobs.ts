import { iconsUpdaterJob } from "~/jobs/icons-updater";
import { pingJob } from "./jobs/ping";
import { queuesJob } from "./jobs/queue";
import { createJobGroup } from "./lib/cron-job/group";

export const jobs = createJobGroup({
  // Add your jobs here:
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,

  // This job is used to process queues.
  queues: queuesJob,
});
