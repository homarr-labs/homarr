import { analyticsJob } from "./jobs/analytics";
import { iconsUpdaterJob } from "./jobs/icons-updater";
import { smartHomeEntityStateJob } from "./jobs/integrations/home-assistant";
import { indexerManagerJob } from "./jobs/integrations/indexer-manager";
import { mediaOrganizerJob } from "./jobs/integrations/media-organizer";
import { mediaRequestsJob } from "./jobs/integrations/media-requests";
import { mediaServerJob } from "./jobs/integrations/media-server";
import { pingJob } from "./jobs/ping";
import type { RssFeed } from "./jobs/rss-feeds";
import { rssFeedsJob } from "./jobs/rss-feeds";
import { createCronJobGroup } from "./lib";

export const jobGroup = createCronJobGroup({
  analytics: analyticsJob,
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,
  smartHomeEntityState: smartHomeEntityStateJob,
  mediaServer: mediaServerJob,
  mediaOrganizer: mediaOrganizerJob,
  mediaRequests: mediaRequestsJob,
  rssFeeds: rssFeedsJob,
  indexerManager: indexerManagerJob,
});

export type JobGroupKeys = ReturnType<(typeof jobGroup)["getKeys"]>[number];
export type { RssFeed };
