import { iconsUpdaterJob } from "~/jobs/icons-updater";
import { smartHomeEntityStateJob } from "~/jobs/integrations/home-assistant";
import { analyticsJob } from "./jobs/analytics";
import { pingJob } from "./jobs/ping";
import { queuesJob } from "./jobs/queue";
import { createCronJobGroup } from "./lib/jobs";
import { mediaOrganizerJob } from "./jobs/integrations/media-organizer";

export const jobs = createCronJobGroup({
  // Add your jobs here:
  analytics: analyticsJob,
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,
  smartHomeEntityState: smartHomeEntityStateJob,
  mediaOrganizer: mediaOrganizerJob,

  // This job is used to process queues.
  queues: queuesJob,
});
