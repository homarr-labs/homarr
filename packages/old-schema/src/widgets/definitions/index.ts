import { expectTypeOf } from "vitest";

import { WidgetKind } from "@homarr/definitions";

import { objectEntries } from "../../../../common/src";
import { WidgetComponentProps } from "../../../../widgets/src";
import { OldmarrBookmarkDefinition } from "./bookmark";
import { OldmarrCalendarDefinition } from "./calendar";
import { OldmarrWidgetKinds } from "./common";
import { OldmarrDashdotDefinition } from "./dashdot";
import { OldmarrDateDefinition } from "./date";
import { OldmarrDlspeedDefinition } from "./dlspeed";
import { OldmarrDnsHoleControlsDefinition } from "./dns-hole-controls";
import { OldmarrDnsHoleSummaryDefinition } from "./dns-hole-summary";
import { OldmarrHealthMonitoringDefinition } from "./health-monitoring";
import { OldmarrIframeDefinition } from "./iframe";
import { OldmarrIndexerManagerDefinition } from "./indexer-manager";
import { OldmarrMediaRequestListDefinition } from "./media-requests-list";
import { OldmarrMediaRequestStatsDefinition } from "./media-requests-stats";
import { OldmarrMediaServerDefinition } from "./media-server";
import { OldmarrMediaTranscodingDefinition } from "./media-transcoding";
import { OldmarrNotebookDefinition } from "./notebook";
import { OldmarrRssDefinition } from "./rss";
import { OldmarrSmartHomeEntityStateDefinition } from "./smart-home-entity-state";
import { OldmarrSmartHomeTriggerAutomationDefinition } from "./smart-home-trigger-automation";
import { OldmarrTorrentStatusDefinition } from "./torrent-status";
import { OldmarrUsenetDefinition } from "./usenet";
import { OldmarrVideoStreamDefinition } from "./video-stream";
import { OldmarrWeatherDefinition } from "./weather";

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
} satisfies Record<WidgetKind, OldmarrWidgetDefinitions["id"] | null>;
// Use null for widgets that did not exist in oldmarr
// TODO: revert assignment so that only old widgets are needed in the object,
// this can be done ones all widgets are implemented

export type WidgetMapping = typeof widgetKindMapping;

export const mapKind = (kind: OldmarrWidgetDefinitions["id"]): WidgetKind =>
  objectEntries(widgetKindMapping).find(([_, value]) => value === kind)![0];
