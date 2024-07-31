import { analyticsJob } from "./jobs/analytics";
import { iconsUpdaterJob } from "./jobs/icons-updater";
import { downloadsJob } from "./jobs/integrations/downloads";
import { smartHomeEntityStateJob } from "./jobs/integrations/home-assistant";
import { mediaOrganizerJob } from "./jobs/integrations/media-organizer";
import { mediaServerJob } from "./jobs/integrations/media-server";
import { pingJob } from "./jobs/ping";
import { createCronJobGroup } from "./lib";

export const jobGroup = createCronJobGroup({
  analytics: analyticsJob,
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,
  smartHomeEntityState: smartHomeEntityStateJob,
  mediaServer: mediaServerJob,
  mediaOrganizer: mediaOrganizerJob,
  downloads: downloadsJob,
});

export type JobGroupKeys = ReturnType<(typeof jobGroup)["getKeys"]>[number];
