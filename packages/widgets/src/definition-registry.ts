import type { WidgetKind } from "@homarr/definitions";

import type { WidgetDefinition } from "./definition";

type CanonicalDefinitionModule<TKind extends WidgetKind> =
  | { definition: WidgetDefinition & { kind: TKind } }
  | { createDefinition: (resources: never) => WidgetDefinition & { kind: TKind } };

export const widgetDefinitionModuleLoaders = {
  clock: () => import("./clock/definition"),
  airQuality: () => import("./air-quality/definition"),
  countdown: () => import("./countdown/definition"),
  timer: () => import("./timer/definition"),
  app: () => import("./app/definition"),
  assistant: () => import("./assistant/definition"),
  archiveTeamWarrior: () => import("./archive-team-warrior/definition"),
  anchorNote: () => import("./anchor-note/definition"),
  notebook: () => import("./notebook/definition"),
  iframe: () => import("./iframe/definition"),
  video: () => import("./video/definition"),
  dnsHoleSummary: () => import("./dns-hole/summary/definition"),
  dnsHoleControls: () => import("./dns-hole/controls/definition"),
  "smartHome-entityState": () => import("./smart-home/entity-state/definition"),
  "smartHome-executeAutomation": () => import("./smart-home/execute-automation/definition"),
  stockPrice: () => import("./stocks/definition"),
  mediaServer: () => import("./media-server/definition"),
  calendar: () => import("./calendar/definition"),
  downloads: () => import("./downloads/definition"),
  "mediaRequests-requestList": () => import("./media-requests/list/definition"),
  "mediaRequests-requestStats": () => import("./media-requests/stats/definition"),
  mediaMissing: () => import("./media-missing/definition"),
  networkControllerSummary: () => import("./network-controller/summary/definition"),
  networkControllerStatus: () => import("./network-controller/network-status/definition"),
  rssFeed: () => import("./rssFeed/definition"),
  bookmarks: () => import("./bookmarks/definition"),
  bazarr: () => import("./bazarr/definition"),
  indexerManager: () => import("./indexer-manager/definition"),
  healthMonitoring: () => import("./health-monitoring/definition"),
  mediaTranscoding: () => import("./media-transcoding/definition"),
  minecraftServerStatus: () => import("./minecraft/server-status/definition"),
  dockerContainers: () => import("./docker/definition"),
  releases: () => import("./releases/definition"),
  firewall: () => import("./firewall/definition"),
  notifications: () => import("./notifications/definition"),
  mediaReleases: () => import("./media-releases/definition"),
  systemResources: () => import("./system-resources/definition"),
  coolify: () => import("./coolify/definition"),
  systemDisks: () => import("./system-disks/definition"),
  timetable: () => import("./timetable/definition"),
  "immich-serverStats": () => import("./immich/server-stats/definition"),
  "immich-albumCarousel": () => import("./immich/album-carousel/definition"),
  stats: () => import("./stats/definition"),
  paperlessNgx: () => import("./paperless-ngx/definition"),
  patchmon: () => import("./patchmon/definition"),
  tracearr: () => import("./tracearr/definition"),
  speedtestTracker: () => import("./speedtest-tracker/definition"),
  uptimeKuma: () => import("./uptime-kuma/definition"),
  audioStats: () => import("./audio-stats/definition"),
  umami: () => import("./umami/definition"),
  vpn: () => import("./vpn/definition"),
  ups: () => import("./ups/definition"),
  beszelSystemTable: () => import("./beszel-system-table/definition"),
  beszelSystemGrid: () => import("./beszel-system-grid/definition"),
  beszelAlerts: () => import("./beszel-alerts/definition"),
  beszelSystemStats: () => import("./beszel-system-stats/definition"),
  traefik: () => import("./traefik/definition"),
  customApi: () => import("./custom-api/definition"),
  weather: () => import("./weather/definition"),
  wud: () => import("./wud/definition"),
  llamacpp: () => import("./llama-cpp/definition"),
  wazuhAgents: () => import("./wazuh-agents/definition"),
  wazuhAlerts: () => import("./wazuh-alerts/definition"),
  wazuhSummary: () => import("./wazuh-summary/definition"),
  wazuhTimeline: () => import("./wazuh-timeline/definition"),
  wazuhTopList: () => import("./wazuh-top-list/definition"),
  wazuhVulnerabilities: () => import("./wazuh-vulnerabilities/definition"),
  wazuhFim: () => import("./wazuh-fim/definition"),
  wazuhAuthFailures: () => import("./wazuh-auth-failures/definition"),
} satisfies { [TKind in WidgetKind]: () => Promise<CanonicalDefinitionModule<TKind>> };

type DefinitionFromModule<TModule> = TModule extends { definition: infer TDefinition }
  ? TDefinition
  : TModule extends { createDefinition: infer TFactory extends (...args: never[]) => unknown }
    ? ReturnType<TFactory>
    : never;

type ResourcesFromModule<TModule> = TModule extends {
  createDefinition: infer TFactory extends (...args: never[]) => unknown;
}
  ? Parameters<TFactory>[0]
  : never;

export type DeriveCanonicalDefinitions<TLoaders extends { [TKind in WidgetKind]: () => Promise<unknown> }> = {
  [TKind in WidgetKind]: DefinitionFromModule<Awaited<ReturnType<TLoaders[TKind]>>>;
};

export type CanonicalDefinitions = DeriveCanonicalDefinitions<typeof widgetDefinitionModuleLoaders>;

export type WidgetDefinitionFor<TKind extends WidgetKind> = CanonicalDefinitions[TKind];

type CanonicalDefinitionResources = {
  [TKind in WidgetKind]: ResourcesFromModule<Awaited<ReturnType<(typeof widgetDefinitionModuleLoaders)[TKind]>>>;
};

export type ResourceWidgetKind = {
  [TKind in WidgetKind]: [CanonicalDefinitionResources[TKind]] extends [never] ? never : TKind;
}[WidgetKind];

export type DefinitionResourcesFor<TKind extends ResourceWidgetKind> = CanonicalDefinitionResources[TKind];
