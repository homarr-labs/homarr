import { analyticsJob } from "./jobs/analytics";
import { iconsUpdaterJob } from "./jobs/icons-updater";
import { dnsHoleJob } from "./jobs/integrations/dns-hole";
import { downloadsJob } from "./jobs/integrations/downloads";
import { healthMonitoringJob } from "./jobs/integrations/health-monitoring";
import { smartHomeEntityStateJob } from "./jobs/integrations/home-assistant";
import { indexerManagerJob } from "./jobs/integrations/indexer-manager";
import { mediaOrganizerJob } from "./jobs/integrations/media-organizer";
import { mediaRequestListJob, mediaRequestStatsJob } from "./jobs/integrations/media-requests";
import { mediaServerJob } from "./jobs/integrations/media-server";
import { pingJob } from "./jobs/ping";
import type { RssFeed } from "./jobs/rss-feeds";
import { rssFeedsJob } from "./jobs/rss-feeds";
import { sessionCleanupJob } from "./jobs/session-cleanup";
import { createCronJobGroup } from "./lib";
import {notificationsFetcherJob} from "./jobs/notifications-fetcher";

export const jobGroup = createCronJobGroup({
  analytics: analyticsJob,
  iconsUpdater: iconsUpdaterJob,
  ping: pingJob,
  smartHomeEntityState: smartHomeEntityStateJob,
  mediaServer: mediaServerJob,
  mediaOrganizer: mediaOrganizerJob,
  downloads: downloadsJob,
  dnsHole: dnsHoleJob,
  mediaRequestStats: mediaRequestStatsJob,
  mediaRequestList: mediaRequestListJob,
  rssFeeds: rssFeedsJob,
  indexerManager: indexerManagerJob,
  healthMonitoring: healthMonitoringJob,
  sessionCleanup: sessionCleanupJob,
  "notifications-fetcher": notificationsFetcherJob
});

export type JobGroupKeys = ReturnType<(typeof jobGroup)["getKeys"]>[number];
export type { RssFeed };
