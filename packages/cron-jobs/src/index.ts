import { analyticsJob } from "./jobs/analytics";
import { iconsUpdaterJob } from "./jobs/icons-updater";
import { smartHomeEntityStateJob } from "./jobs/integrations/home-assistant";
import { pingJob } from "./jobs/ping";
import { createCronJobGroup } from "./lib";
import { mediaOrganizerJob } from "./jobs/integrations/media-organizer";

export const jobGroup = createCronJobGroup({
  analytics: analyticsJob,
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,
  smartHomeEntityState: smartHomeEntityStateJob,
  mediaOrganizer: mediaOrganizerJob
});

export type JobGroupKeys = ReturnType<(typeof jobGroup)["getKeys"]>[number];
