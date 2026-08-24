import type { IntegrationKind, WidgetKind } from "@homarr/definitions";

import type * as airQuality from "./air-quality";
import type * as anchorNote from "./anchor-note";
import type * as app from "./app";
import type * as archiveTeamWarrior from "./archive-team-warrior";
import type * as assistant from "./assistant";
import type * as audioStats from "./audio-stats";
import type * as bazarr from "./bazarr";
import type * as beszelAlerts from "./beszel-alerts";
import type * as beszelSystemGrid from "./beszel-system-grid";
import type * as beszelSystemStats from "./beszel-system-stats";
import type * as beszelSystemTable from "./beszel-system-table";
import type * as bookmarks from "./bookmarks";
import type * as calendar from "./calendar";
import type * as clock from "./clock";
import type * as coolify from "./coolify";
import type * as countdown from "./countdown";
import type * as customApi from "./custom-api";
import type * as dnsHoleControls from "./dns-hole/controls";
import type * as dnsHoleSummary from "./dns-hole/summary";
import type * as dockerContainers from "./docker";
import type * as downloads from "./downloads";
import type * as firewall from "./firewall";
import type * as healthMonitoring from "./health-monitoring";
import type * as iframe from "./iframe";
import type * as immichAlbumCarousel from "./immich/album-carousel";
import type * as immichServerStats from "./immich/server-stats";
import type * as indexerManager from "./indexer-manager";
import type * as mediaMissing from "./media-missing";
import type * as mediaReleases from "./media-releases";
import type * as mediaRequestsList from "./media-requests/list";
import type * as mediaRequestsStats from "./media-requests/stats";
import type * as mediaServer from "./media-server";
import type * as mediaTranscoding from "./media-transcoding";
import type * as minecraftServerStatus from "./minecraft/server-status";
import type * as networkControllerStatus from "./network-controller/network-status";
import type * as networkControllerSummary from "./network-controller/summary";
import type * as notebook from "./notebook";
import type * as notifications from "./notifications";
import type * as paperlessNgx from "./paperless-ngx";
import type * as patchmon from "./patchmon";
import type * as releases from "./releases";
import type * as rssFeed from "./rssFeed";
import type * as smartHomeEntityState from "./smart-home/entity-state";
import type * as smartHomeExecuteAutomation from "./smart-home/execute-automation";
import type * as speedtestTracker from "./speedtest-tracker";
import type * as stockPrice from "./stocks";
import type * as systemDisks from "./system-disks";
import type * as systemResources from "./system-resources";
import type * as timetable from "./timetable";
import type * as timer from "./timer";
import type * as tracearr from "./tracearr";
import type * as traefik from "./traefik";
import type * as umami from "./umami";
import type * as ups from "./ups";
import type * as uptimeKuma from "./uptime-kuma";
import type * as video from "./video";
import type * as vpn from "./vpn";
import type * as weather from "./weather";
import type * as wud from "./wud";

// Keep these imports explicit so Next.js and Turbopack can discover every widget
// module without loading any widget definition or component eagerly.
export const widgetModuleLoaders = {
  clock: () => import("./clock"),
  airQuality: () => import("./air-quality"),
  countdown: () => import("./countdown"),
  timer: () => import("./timer"),
  app: () => import("./app"),
  assistant: () => import("./assistant"),
  archiveTeamWarrior: () => import("./archive-team-warrior"),
  anchorNote: () => import("./anchor-note"),
  notebook: () => import("./notebook"),
  iframe: () => import("./iframe"),
  video: () => import("./video"),
  dnsHoleSummary: () => import("./dns-hole/summary"),
  dnsHoleControls: () => import("./dns-hole/controls"),
  "smartHome-entityState": () => import("./smart-home/entity-state"),
  "smartHome-executeAutomation": () => import("./smart-home/execute-automation"),
  stockPrice: () => import("./stocks"),
  mediaServer: () => import("./media-server"),
  calendar: () => import("./calendar"),
  downloads: () => import("./downloads"),
  "mediaRequests-requestList": () => import("./media-requests/list"),
  "mediaRequests-requestStats": () => import("./media-requests/stats"),
  mediaMissing: () => import("./media-missing"),
  networkControllerSummary: () => import("./network-controller/summary"),
  networkControllerStatus: () => import("./network-controller/network-status"),
  rssFeed: () => import("./rssFeed"),
  bookmarks: () => import("./bookmarks"),
  bazarr: () => import("./bazarr"),
  indexerManager: () => import("./indexer-manager"),
  healthMonitoring: () => import("./health-monitoring"),
  mediaTranscoding: () => import("./media-transcoding"),
  minecraftServerStatus: () => import("./minecraft/server-status"),
  dockerContainers: () => import("./docker"),
  releases: () => import("./releases"),
  firewall: () => import("./firewall"),
  notifications: () => import("./notifications"),
  mediaReleases: () => import("./media-releases"),
  systemResources: () => import("./system-resources"),
  coolify: () => import("./coolify"),
  systemDisks: () => import("./system-disks"),
  timetable: () => import("./timetable"),
  "immich-serverStats": () => import("./immich/server-stats"),
  "immich-albumCarousel": () => import("./immich/album-carousel"),
  paperlessNgx: () => import("./paperless-ngx"),
  patchmon: () => import("./patchmon"),
  tracearr: () => import("./tracearr"),
  speedtestTracker: () => import("./speedtest-tracker"),
  uptimeKuma: () => import("./uptime-kuma"),
  audioStats: () => import("./audio-stats"),
  umami: () => import("./umami"),
  vpn: () => import("./vpn"),
  ups: () => import("./ups"),
  beszelSystemTable: () => import("./beszel-system-table"),
  beszelSystemGrid: () => import("./beszel-system-grid"),
  beszelAlerts: () => import("./beszel-alerts"),
  beszelSystemStats: () => import("./beszel-system-stats"),
  traefik: () => import("./traefik"),
  customApi: () => import("./custom-api"),
  weather: () => import("./weather"),
  wud: () => import("./wud"),
} satisfies { [TKind in WidgetKind]: () => Promise<WidgetImports[TKind]> };

export type WidgetImports = {
  clock: typeof clock;
  airQuality: typeof airQuality;
  countdown: typeof countdown;
  timer: typeof timer;
  app: typeof app;
  assistant: typeof assistant;
  archiveTeamWarrior: typeof archiveTeamWarrior;
  anchorNote: typeof anchorNote;
  notebook: typeof notebook;
  iframe: typeof iframe;
  video: typeof video;
  dnsHoleSummary: typeof dnsHoleSummary;
  dnsHoleControls: typeof dnsHoleControls;
  "smartHome-entityState": typeof smartHomeEntityState;
  "smartHome-executeAutomation": typeof smartHomeExecuteAutomation;
  stockPrice: typeof stockPrice;
  mediaServer: typeof mediaServer;
  calendar: typeof calendar;
  downloads: typeof downloads;
  "mediaRequests-requestList": typeof mediaRequestsList;
  "mediaRequests-requestStats": typeof mediaRequestsStats;
  mediaMissing: typeof mediaMissing;
  networkControllerSummary: typeof networkControllerSummary;
  networkControllerStatus: typeof networkControllerStatus;
  rssFeed: typeof rssFeed;
  bookmarks: typeof bookmarks;
  bazarr: typeof bazarr;
  indexerManager: typeof indexerManager;
  healthMonitoring: typeof healthMonitoring;
  mediaTranscoding: typeof mediaTranscoding;
  minecraftServerStatus: typeof minecraftServerStatus;
  dockerContainers: typeof dockerContainers;
  releases: typeof releases;
  firewall: typeof firewall;
  notifications: typeof notifications;
  mediaReleases: typeof mediaReleases;
  systemResources: typeof systemResources;
  coolify: typeof coolify;
  systemDisks: typeof systemDisks;
  timetable: typeof timetable;
  "immich-serverStats": typeof immichServerStats;
  "immich-albumCarousel": typeof immichAlbumCarousel;
  paperlessNgx: typeof paperlessNgx;
  patchmon: typeof patchmon;
  tracearr: typeof tracearr;
  speedtestTracker: typeof speedtestTracker;
  uptimeKuma: typeof uptimeKuma;
  audioStats: typeof audioStats;
  umami: typeof umami;
  vpn: typeof vpn;
  ups: typeof ups;
  beszelSystemTable: typeof beszelSystemTable;
  beszelSystemGrid: typeof beszelSystemGrid;
  beszelAlerts: typeof beszelAlerts;
  beszelSystemStats: typeof beszelSystemStats;
  traefik: typeof traefik;
  customApi: typeof customApi;
  weather: typeof weather;
  wud: typeof wud;
};

export type WidgetImportKey = keyof WidgetImports;

export type inferSupportedIntegrations<TKind extends WidgetKind> = (WidgetImports[TKind]["definition"] extends {
  supportedIntegrations: string[];
}
  ? WidgetImports[TKind]["definition"]["supportedIntegrations"]
  : string[])[number];

export type inferSupportedIntegrationsStrict<TKind extends WidgetKind> = (WidgetImports[TKind]["definition"] extends {
  supportedIntegrations: IntegrationKind[];
}
  ? WidgetImports[TKind]["definition"]["supportedIntegrations"]
  : never[])[number];
