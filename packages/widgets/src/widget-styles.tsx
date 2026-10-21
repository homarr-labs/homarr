"use client";

import type { ComponentType } from "react";
import { Suspense } from "react";
import dynamic from "next/dynamic";

import type { WidgetKind } from "@homarr/definitions";

const NoStyles = () => null;

const widgetStyles = {
  clock: dynamic(() => import("./clock/component").then(() => NoStyles)),
  airQuality: dynamic(() => import("./air-quality/component").then(() => NoStyles)),
  countdown: dynamic(() => import("./countdown/component").then(() => NoStyles)),
  timer: dynamic(() => import("./timer/component").then(() => NoStyles)),
  app: dynamic(() => import("./app/component").then(() => NoStyles)),
  assistant: dynamic(() => import("./assistant/component").then(() => NoStyles)),
  archiveTeamWarrior: dynamic(() => import("./archive-team-warrior/component").then(() => NoStyles)),
  anchorNote: dynamic(() => import("./anchor-note/component").then(() => NoStyles)),
  notebook: dynamic(() => import("./notebook/component").then(() => NoStyles)),
  iframe: dynamic(() => import("./iframe/component").then(() => NoStyles)),
  video: dynamic(() => import("./video/component").then(() => NoStyles)),
  dnsHoleSummary: dynamic(() => import("./dns-hole/summary/component").then(() => NoStyles)),
  dnsHoleControls: dynamic(() => import("./dns-hole/controls/component").then(() => NoStyles)),
  "smartHome-entityState": dynamic(() => import("./smart-home/entity-state/component").then(() => NoStyles)),
  "smartHome-executeAutomation": dynamic(() =>
    import("./smart-home/execute-automation/component").then(() => NoStyles),
  ),
  stockPrice: dynamic(() => import("./stocks/component").then(() => NoStyles)),
  mediaServer: dynamic(() => import("./media-server/component").then(() => NoStyles)),
  calendar: dynamic(() => import("./calendar/component").then(() => NoStyles)),
  downloads: dynamic(() => import("./downloads/component").then(() => NoStyles)),
  "mediaRequests-requestList": dynamic(() => import("./media-requests/list/component").then(() => NoStyles)),
  "mediaRequests-requestStats": dynamic(() => import("./media-requests/stats/component").then(() => NoStyles)),
  mediaMissing: dynamic(() => import("./media-missing/component").then(() => NoStyles)),
  networkControllerSummary: dynamic(() => import("./network-controller/summary/component").then(() => NoStyles)),
  networkControllerStatus: dynamic(() => import("./network-controller/network-status/component").then(() => NoStyles)),
  rssFeed: dynamic(() => import("./rssFeed/component").then(() => NoStyles)),
  bookmarks: dynamic(() => import("./bookmarks/component").then(() => NoStyles)),
  bazarr: dynamic(() => import("./bazarr/component").then(() => NoStyles)),
  indexerManager: dynamic(() => import("./indexer-manager/component").then(() => NoStyles)),
  healthMonitoring: dynamic(() => import("./health-monitoring/component").then(() => NoStyles)),
  mediaTranscoding: dynamic(() => import("./media-transcoding/component").then(() => NoStyles)),
  minecraftServerStatus: dynamic(() => import("./minecraft/server-status/component").then(() => NoStyles)),
  dockerContainers: dynamic(() => import("./docker/component").then(() => NoStyles)),
  releases: dynamic(() => import("./releases/component").then(() => NoStyles)),
  firewall: dynamic(() => import("./firewall/component").then(() => NoStyles)),
  notifications: dynamic(() => import("./notifications/component").then(() => NoStyles)),
  mediaReleases: dynamic(() => import("./media-releases/component").then(() => NoStyles)),
  systemResources: dynamic(() => import("./system-resources/component").then(() => NoStyles)),
  coolify: dynamic(() => import("./coolify/component").then(() => NoStyles)),
  systemDisks: dynamic(() => import("./system-disks/component").then(() => NoStyles)),
  timetable: dynamic(() => import("./timetable/component").then(() => NoStyles)),
  "immich-serverStats": dynamic(() => import("./immich/server-stats/component").then(() => NoStyles)),
  "immich-albumCarousel": dynamic(() => import("./immich/album-carousel/component").then(() => NoStyles)),
  stats: dynamic(() => import("./stats/component").then(() => NoStyles)),
  paperlessNgx: dynamic(() => import("./paperless-ngx/component").then(() => NoStyles)),
  patchmon: dynamic(() => import("./patchmon/component").then(() => NoStyles)),
  tracearr: dynamic(() => import("./tracearr/component").then(() => NoStyles)),
  speedtestTracker: dynamic(() => import("./speedtest-tracker/component").then(() => NoStyles)),
  uptimeKuma: dynamic(() => import("./uptime-kuma/component").then(() => NoStyles)),
  audioStats: dynamic(() => import("./audio-stats/component").then(() => NoStyles)),
  umami: dynamic(() => import("./umami/component").then(() => NoStyles)),
  vpn: dynamic(() => import("./vpn/component").then(() => NoStyles)),
  ups: dynamic(() => import("./ups/component").then(() => NoStyles)),
  beszelSystemTable: dynamic(() => import("./beszel-system-table/component").then(() => NoStyles)),
  beszelSystemGrid: dynamic(() => import("./beszel-system-grid/component").then(() => NoStyles)),
  beszelAlerts: dynamic(() => import("./beszel-alerts/component").then(() => NoStyles)),
  beszelSystemStats: dynamic(() => import("./beszel-system-stats/component").then(() => NoStyles)),
  traefik: dynamic(() => import("./traefik/component").then(() => NoStyles)),
  customApi: dynamic(() => import("./custom-api/component").then(() => NoStyles)),
  weather: dynamic(() => import("./weather/component").then(() => NoStyles)),
  wud: dynamic(() => import("./wud/component").then(() => NoStyles)),
  llamacpp: dynamic(() => import("./llama-cpp/component").then(() => NoStyles)),
  wazuh: dynamic(() => import("./wazuh/component").then(() => NoStyles)),
  "thingport-libraryStats": dynamic(() => import("./thingport/library-stats/component").then(() => NoStyles)),
  "thingport-models": dynamic(() => import("./thingport/models/component").then(() => NoStyles)),
  "thingport-featuredModel": dynamic(() => import("./thingport/featured-model/component").then(() => NoStyles)),
  "thingport-activityHeatmap": dynamic(() => import("./thingport/activity-heatmap/component").then(() => NoStyles)),
} satisfies Record<WidgetKind, ComponentType>;

export const WidgetStyles = ({ kinds }: { kinds: WidgetKind[] }) => {
  // Register CSS during SSR without importing every offscreen Widget again
  // in the browser just to render these empty style-registration components.
  return (
    <Suspense fallback={null}>
      {typeof window === "undefined" &&
        kinds.map((kind) => {
          const Styles = widgetStyles[kind];
          return <Styles key={kind} />;
        })}
    </Suspense>
  );
};
