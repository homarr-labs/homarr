import type { WidgetKind } from "@homarr/definitions";

import { serverDefinition as anchorNote } from "./anchor-note/definition";
import { serverDefinition as app } from "./app/definition";
import { serverDefinition as bookmarks } from "./bookmarks/definition";
import { serverDefinition as calendar } from "./calendar/definition";
import { serverDefinition as clock } from "./clock/definition";
import { serverDefinition as coolify } from "./coolify/definition";
import { serverDefinition as dnsHoleControls } from "./dns-hole/controls/definition";
import { serverDefinition as dnsHoleSummary } from "./dns-hole/summary/definition";
import { serverDefinition as dockerContainers } from "./docker/definition";
import { serverDefinition as downloads } from "./downloads/definition";
import { serverDefinition as firewall } from "./firewall/definition";
import { serverDefinition as healthMonitoring } from "./health-monitoring/definition";
import { serverDefinition as iframe } from "./iframe/definition";
import { serverDefinition as immichAlbumCarousel } from "./immich/album-carousel/definition";
import { serverDefinition as immichServerStats } from "./immich/server-stats/definition";
import { serverDefinition as indexerManager } from "./indexer-manager/definition";
import { serverDefinition as mediaReleases } from "./media-releases/definition";
import { serverDefinition as mediaRequestsList } from "./media-requests/list/definition";
import { serverDefinition as mediaRequestsStats } from "./media-requests/stats/definition";
import { serverDefinition as mediaServer } from "./media-server/definition";
import { serverDefinition as mediaTranscoding } from "./media-transcoding/definition";
import { serverDefinition as minecraftServerStatus } from "./minecraft/server-status/definition";
import { serverDefinition as networkControllerStatus } from "./network-controller/network-status/definition";
import { serverDefinition as networkControllerSummary } from "./network-controller/summary/definition";
import { serverDefinition as notebook } from "./notebook/definition";
import { serverDefinition as notifications } from "./notifications/definition";
import { serverDefinition as releases } from "./releases/definition";
import { serverDefinition as rssFeed } from "./rssFeed/definition";
import { serverDefinition as smartHomeEntityState } from "./smart-home/entity-state/definition";
import { serverDefinition as smartHomeExecuteAutomation } from "./smart-home/execute-automation/definition";
import { serverDefinition as speedtestTracker } from "./speedtest-tracker/definition";
import { serverDefinition as stockPrice } from "./stocks/definition";
import { serverDefinition as systemDisks } from "./system-disks/definition";
import { serverDefinition as systemResources } from "./system-resources/definition";
import { serverDefinition as timetable } from "./timetable/definition";
import { serverDefinition as tracearr } from "./tracearr/definition";
import { serverDefinition as video } from "./video/definition";
import { serverDefinition as weather } from "./weather/definition";

// These type-only re-exports are erased at runtime — no UI code is bundled.
export type { inferSupportedIntegrationsStrict } from ".";
export type { WidgetComponentProps } from "./definition";

type AnyServerDefinition = { createOptions: (settings?: unknown) => Record<string, { defaultValue: unknown }> };

const widgetServerImports: Record<WidgetKind, AnyServerDefinition> = {
  clock,
  weather,
  app,
  anchorNote,
  notebook,
  iframe,
  video,
  dnsHoleSummary,
  dnsHoleControls,
  "smartHome-entityState": smartHomeEntityState,
  "smartHome-executeAutomation": smartHomeExecuteAutomation,
  stockPrice,
  mediaServer,
  calendar,
  downloads,
  "mediaRequests-requestList": mediaRequestsList,
  "mediaRequests-requestStats": mediaRequestsStats,
  networkControllerSummary,
  networkControllerStatus,
  rssFeed,
  bookmarks,
  indexerManager,
  healthMonitoring,
  mediaTranscoding,
  minecraftServerStatus,
  dockerContainers,
  releases,
  firewall,
  notifications,
  mediaReleases,
  systemResources,
  coolify,
  systemDisks,
  timetable,
  "immich-serverStats": immichServerStats,
  "immich-albumCarousel": immichAlbumCarousel,
  tracearr,
  speedtestTracker,
};

export const reduceWidgetOptionsWithDefaultValues = (
  kind: WidgetKind,
  settings: { enableStatusByDefault: boolean; forceDisableStatus: boolean },
  currentValue: Record<string, unknown> = {},
) => {
  const definition = widgetServerImports[kind];
  const options = definition.createOptions(settings);
  return Object.entries(options).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: currentValue[key] ?? value.defaultValue,
    }),
    {} as Record<string, unknown>,
  );
};
