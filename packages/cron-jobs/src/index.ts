import { analyticsJob } from "./jobs/analytics";
import { iconsUpdaterJob } from "./jobs/icons-updater";
import { smartHomeEntityStateJob } from "./jobs/integrations/home-assistant";
import { mediaOrganizerJob } from "./jobs/integrations/media-organizer";
import { mediaServerJob } from "./jobs/integrations/media-server";
import { pingJob } from "./jobs/ping";
import { createCronJobGroup } from "./lib";
import { usenetDownloadsJob } from "./jobs/integrations/usenet-downloads";

export const jobGroup = createCronJobGroup({
  analytics: analyticsJob,
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,
  smartHomeEntityState: smartHomeEntityStateJob,
  mediaServer: mediaServerJob,
  mediaOrganizer: mediaOrganizerJob,
  usenetDownloads: usenetDownloadsJob
});

export type JobGroupKeys = ReturnType<(typeof jobGroup)["getKeys"]>[number];
