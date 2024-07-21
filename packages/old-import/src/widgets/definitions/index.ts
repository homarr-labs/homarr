import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";

import type { OldmarrBookmarkDefinition } from "./bookmark";
import type { OldmarrCalendarDefinition } from "./calendar";
import type { OldmarrDashdotDefinition } from "./dashdot";
import type { OldmarrDateDefinition } from "./date";
import type { OldmarrDlspeedDefinition } from "./dlspeed";
import type { OldmarrDnsHoleControlsDefinition } from "./dns-hole-controls";
import type { OldmarrDnsHoleSummaryDefinition } from "./dns-hole-summary";
import type { OldmarrHealthMonitoringDefinition } from "./health-monitoring";
import type { OldmarrIframeDefinition } from "./iframe";
import type { OldmarrIndexerManagerDefinition } from "./indexer-manager";
import type { OldmarrMediaRequestListDefinition } from "./media-requests-list";
import type { OldmarrMediaRequestStatsDefinition } from "./media-requests-stats";
import type { OldmarrMediaServerDefinition } from "./media-server";
import type { OldmarrMediaTranscodingDefinition } from "./media-transcoding";
import type { OldmarrNotebookDefinition } from "./notebook";
import type { OldmarrRssDefinition } from "./rss";
import type { OldmarrSmartHomeEntityStateDefinition } from "./smart-home-entity-state";
import type { OldmarrSmartHomeTriggerAutomationDefinition } from "./smart-home-trigger-automation";
import type { OldmarrTorrentStatusDefinition } from "./torrent-status";
import type { OldmarrUsenetDefinition } from "./usenet";
import type { OldmarrVideoStreamDefinition } from "./video-stream";
import type { OldmarrWeatherDefinition } from "./weather";

export type OldmarrWidgetDefinitions =
  | OldmarrWeatherDefinition
  | OldmarrDateDefinition
  | OldmarrCalendarDefinition
  | OldmarrIndexerManagerDefinition
  | OldmarrDashdotDefinition
  | OldmarrUsenetDefinition
  | OldmarrTorrentStatusDefinition
  | OldmarrDlspeedDefinition
  | OldmarrRssDefinition
  | OldmarrVideoStreamDefinition
  | OldmarrIframeDefinition
  | OldmarrMediaServerDefinition
  | OldmarrMediaRequestListDefinition
  | OldmarrMediaRequestStatsDefinition
  | OldmarrDnsHoleSummaryDefinition
  | OldmarrDnsHoleControlsDefinition
  | OldmarrBookmarkDefinition
  | OldmarrNotebookDefinition
  | OldmarrSmartHomeEntityStateDefinition
  | OldmarrSmartHomeTriggerAutomationDefinition
  | OldmarrHealthMonitoringDefinition
  | OldmarrMediaTranscodingDefinition;

export const widgetKindMapping = {
  app: null, // In oldmarr apps were not widgets
  clock: "date",
  calendar: "calendar",
  downloads: "torrents-status",
  weather: "weather",
  rssFeed: "rss",
  video: "video-stream",
  iframe: "iframe",
  mediaServer: "media-server",
  dnsHoleSummary: "dns-hole-summary",
  dnsHoleControls: "dns-hole-controls",
  notebook: "notebook",
  "smartHome-entityState": "smart-home/entity-state",
  "smartHome-executeAutomation": "smart-home/trigger-automation",
  "mediaRequests-requestList": "media-requests-list",
  "mediaRequests-requestStats": "media-requests-stats",
  indexerManager: "indexer-manager",
  bookmarks: "bookmark",
  healthMonitoring: "health-monitoring",
  hardwareUsage: "dashdot",
} satisfies Record<WidgetKind, OldmarrWidgetDefinitions["id"] | null>;
// Use null for widgets that did not exist in oldmarr
// TODO: revert assignment so that only old widgets are needed in the object,
// this can be done ones all widgets are implemented

export type WidgetMapping = typeof widgetKindMapping;

export const mapKind = (kind: OldmarrWidgetDefinitions["id"]): WidgetKind | undefined =>
  objectEntries(widgetKindMapping).find(([_, value]) => value === kind)?.[0];
