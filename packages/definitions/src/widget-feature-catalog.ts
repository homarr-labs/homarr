import type { AtLeastOneOf } from "@homarr/common/types";

import type { IntegrationKind } from "./integration";
import { getIntegrationKindsByCategory } from "./integration";
import type { IntegrationKindByCategory } from "./integration";
import { generatedWidgetFeatureCatalog } from "./generated/widget-modules";

const {
  weather: generatedWeatherFeature,
  downloads: generatedDownloadsFeature,
  ...additionalGeneratedWidgetFeatures
} = generatedWidgetFeatureCatalog;

export interface NativeFeatureCapabilityDescriptor {
  integrations: Readonly<AtLeastOneOf<IntegrationKind>>;
  connectionOptional?: true;
  serverMaxIntegrations?: number;
}

interface WidgetFeatureDescriptorBase {
  documentationSlug: string | null;
  defaultSize?: Readonly<{ width: number; height: number }>;
  query?: {
    paths: readonly (readonly string[])[];
    refetchIntervalSeconds?: number | null;
  };
}

interface WidgetFeatureDescriptorWithDefaultName extends WidgetFeatureDescriptorBase {
  displayNameFromIntegration?: false;
  capability?: NativeFeatureCapabilityDescriptor;
}

interface WidgetFeatureDescriptorWithIntegrationName extends WidgetFeatureDescriptorBase {
  displayNameFromIntegration: true;
  capability: Omit<NativeFeatureCapabilityDescriptor, "integrations"> & {
    integrations: readonly [IntegrationKind];
  };
}

export type WidgetFeatureDescriptor =
  | WidgetFeatureDescriptorWithDefaultName
  | WidgetFeatureDescriptorWithIntegrationName;

const defineWidgetFeatureCatalog = <const TCatalog extends Record<string, WidgetFeatureDescriptor>>(
  catalog: TCatalog,
) => catalog;

type GeneralHealthMonitoringIntegrationKind = Exclude<
  IntegrationKindByCategory<"healthMonitoring">,
  "patchmon" | "wud"
>;

const generalHealthMonitoringIntegrationKinds = getIntegrationKindsByCategory("healthMonitoring").filter(
  (kind): kind is GeneralHealthMonitoringIntegrationKind => kind !== "patchmon" && kind !== "wud",
) as AtLeastOneOf<GeneralHealthMonitoringIntegrationKind>;

/**
 * Server-safe source of truth for native widgets.
 *
 * Keep each widget's stable kind, documentation, default size, and integration
 * contract together so every lightweight consumer can derive the same view.
 */
export const widgetFeatureCatalog = defineWidgetFeatureCatalog({
  clock: {
    documentationSlug: "clock",
    defaultSize: { width: 2, height: 1 },
    query: { paths: [["widget", "weather", "atLocation"]] },
  },
  weather: generatedWeatherFeature,
  airQuality: {
    documentationSlug: "air-quality",
    defaultSize: { width: 2, height: 1 },
    query: { paths: [["widget", "airQuality", "atLocation"]], refetchIntervalSeconds: 900 },
  },
  countdown: { documentationSlug: "countdown", defaultSize: { width: 2, height: 1 } },
  timer: { documentationSlug: "timer", defaultSize: { width: 2, height: 1 } },
  app: {
    documentationSlug: "app",
    query: {
      paths: [
        ["app", "byId"],
        ["widget", "app", "ping"],
      ],
    },
  },
  iframe: { documentationSlug: "iframe" },
  video: { documentationSlug: "video" },
  notebook: { documentationSlug: "notebook" },
  anchorNote: {
    documentationSlug: "anchor-note",
    capability: { integrations: ["anchor"], serverMaxIntegrations: 1 },
    query: { paths: [["widget", "anchorNotes"]] },
  },
  dnsHoleSummary: {
    documentationSlug: "dns-hole-summary",
    capability: { integrations: getIntegrationKindsByCategory("dnsHole") },
    query: { paths: [["widget", "dnsHole"]], refetchIntervalSeconds: 10 },
  },
  dnsHoleControls: {
    documentationSlug: "dns-hole-controls",
    capability: { integrations: getIntegrationKindsByCategory("dnsHole") },
    query: { paths: [["widget", "dnsHole"]], refetchIntervalSeconds: 10 },
  },
  "smartHome-entityState": {
    documentationSlug: "smart-home-entity-state",
    capability: {
      integrations: getIntegrationKindsByCategory("smartHomeServer"),
      serverMaxIntegrations: 1,
    },
    query: { paths: [["widget", "smartHome"]] },
  },
  "smartHome-executeAutomation": {
    documentationSlug: "smart-home-execute-automation",
    capability: {
      integrations: getIntegrationKindsByCategory("smartHomeServer"),
      serverMaxIntegrations: 1,
    },
  },
  stockPrice: {
    documentationSlug: "stock-price",
    query: { paths: [["widget", "stockPrice", "getPriceHistory"]], refetchIntervalSeconds: null },
  },
  mediaServer: {
    documentationSlug: "media-server",
    capability: { integrations: getIntegrationKindsByCategory("mediaService") },
    query: { paths: [["widget", "mediaServer", "getCurrentStreams"]], refetchIntervalSeconds: 10 },
  },
  calendar: {
    documentationSlug: "calendar",
    capability: { integrations: getIntegrationKindsByCategory("calendar"), connectionOptional: true },
    query: { paths: [["widget", "calendar", "findAllEvents"]] },
  },
  downloads: generatedDownloadsFeature,
  "mediaRequests-requestList": {
    documentationSlug: "media-request-list",
    capability: { integrations: getIntegrationKindsByCategory("mediaRequest") },
    query: { paths: [["widget", "mediaRequests", "getLatestRequests"]] },
  },
  "mediaRequests-requestStats": {
    documentationSlug: "media-request-stats",
    capability: { integrations: getIntegrationKindsByCategory("mediaRequest") },
    query: { paths: [["widget", "mediaRequests", "getStats"]] },
  },
  mediaTranscoding: {
    documentationSlug: "media-transcoding",
    capability: {
      integrations: getIntegrationKindsByCategory("mediaTranscoding"),
      serverMaxIntegrations: 1,
    },
    query: { paths: [["widget", "mediaTranscoding", "getDataAsync"]], refetchIntervalSeconds: null },
  },
  mediaMissing: {
    documentationSlug: "media-missing",
    defaultSize: { width: 4, height: 3 },
    capability: { integrations: getIntegrationKindsByCategory("mediaOrganizer") },
    query: { paths: [["widget", "mediaOrganizer", "getData"]] },
  },
  minecraftServerStatus: {
    documentationSlug: "minecraft-server-status",
    query: { paths: [["widget", "minecraft", "getServerStatus"]], refetchIntervalSeconds: null },
  },
  networkControllerSummary: {
    documentationSlug: "network-controller-summary",
    capability: { integrations: getIntegrationKindsByCategory("networkController") },
    query: { paths: [["widget", "networkController"]], refetchIntervalSeconds: null },
  },
  networkControllerStatus: {
    documentationSlug: "network-controller-status",
    capability: { integrations: getIntegrationKindsByCategory("networkController") },
    query: { paths: [["widget", "networkController"]], refetchIntervalSeconds: null },
  },
  rssFeed: {
    documentationSlug: "rss-feed",
    query: { paths: [["widget", "rssFeed", "getFeeds"]], refetchIntervalSeconds: null },
  },
  bookmarks: {
    documentationSlug: "bookmarks",
    defaultSize: { width: 2, height: 2 },
    query: { paths: [["app", "byIds"]] },
  },
  indexerManager: {
    documentationSlug: "indexer-manager",
    capability: { integrations: getIntegrationKindsByCategory("indexerManager") },
    query: { paths: [["widget", "indexerManager"]], refetchIntervalSeconds: null },
  },
  healthMonitoring: {
    documentationSlug: "health-monitoring",
    capability: { integrations: generalHealthMonitoringIntegrationKinds },
    query: {
      paths: [
        ["integration", "byIds"],
        ["widget", "healthMonitoring"],
      ],
      refetchIntervalSeconds: 10,
    },
  },
  releases: {
    documentationSlug: "releases",
    query: { paths: [["widget", "releases", "getLatest"]], refetchIntervalSeconds: null },
  },
  mediaReleases: {
    documentationSlug: "media-releases",
    capability: { integrations: ["mock", "emby", "jellyfin", "plex"] },
    query: { paths: [["widget", "mediaRelease"]], refetchIntervalSeconds: null },
  },
  dockerContainers: {
    documentationSlug: "docker-containers",
    query: { paths: [["docker", "getContainers"]], refetchIntervalSeconds: 30 },
  },
  firewall: {
    documentationSlug: "firewall",
    capability: { integrations: getIntegrationKindsByCategory("firewall") },
    query: { paths: [["widget", "firewall"]], refetchIntervalSeconds: 10 },
  },
  notifications: {
    documentationSlug: "notifications",
    capability: { integrations: getIntegrationKindsByCategory("notifications") },
    query: { paths: [["widget", "notifications", "getNotifications"]] },
  },
  systemResources: {
    documentationSlug: "system-resources",
    capability: {
      integrations: ["dashDot", "openmediavault", "truenas", "unraid", "glances", "synology"],
    },
    query: { paths: [["widget", "healthMonitoring"]], refetchIntervalSeconds: 10 },
  },
  coolify: {
    documentationSlug: "coolify",
    displayNameFromIntegration: true,
    capability: { integrations: ["coolify"] },
    query: { paths: [["widget", "coolify"]] },
  },
  systemDisks: {
    documentationSlug: "system-disks",
    capability: { integrations: ["dashDot", "openmediavault", "truenas", "unraid", "synology"] },
    query: { paths: [["widget", "healthMonitoring"]], refetchIntervalSeconds: 10 },
  },
  timetable: {
    documentationSlug: "timetable",
    query: { paths: [["widget", "timetable"]] },
  },
  "immich-serverStats": {
    documentationSlug: "immich-server-stats",
    capability: { integrations: ["immich"], serverMaxIntegrations: 1 },
    query: {
      paths: [
        ["widget", "immich", "getServerStats"],
        ["widget", "immich", "getAlbums"],
      ],
      refetchIntervalSeconds: null,
    },
  },
  "immich-albumCarousel": {
    documentationSlug: "immich-album-carousel",
    capability: { integrations: ["immich"], serverMaxIntegrations: 1 },
    query: {
      paths: [
        ["widget", "immich", "getAlbum"],
        ["widget", "immich", "getAlbums"],
      ],
      refetchIntervalSeconds: null,
    },
  },
  paperlessNgx: {
    documentationSlug: "paperless-ngx",
    defaultSize: { width: 2, height: 2 },
    displayNameFromIntegration: true,
    capability: { integrations: ["paperlessNgx"], serverMaxIntegrations: 1 },
    query: { paths: [["widget", "paperlessNgx"]], refetchIntervalSeconds: null },
  },
  patchmon: {
    documentationSlug: "patchmon",
    defaultSize: { width: 2, height: 2 },
    displayNameFromIntegration: true,
    capability: { integrations: ["patchmon"], serverMaxIntegrations: 1 },
    query: { paths: [["widget", "patchmon"]] },
  },
  bazarr: {
    documentationSlug: "bazarr",
    defaultSize: { width: 2, height: 2 },
    displayNameFromIntegration: true,
    capability: { integrations: ["bazarr"], serverMaxIntegrations: 1 },
    query: { paths: [["widget", "bazarr"]] },
  },
  tracearr: {
    documentationSlug: "tracearr",
    displayNameFromIntegration: true,
    capability: { integrations: ["tracearr"] },
    query: { paths: [["widget", "tracearr"]], refetchIntervalSeconds: 10 },
  },
  speedtestTracker: {
    documentationSlug: "speedtest-tracker",
    capability: { integrations: ["speedtestTracker"] },
    query: { paths: [["widget", "speedtestTracker"]], refetchIntervalSeconds: null },
  },
  uptimeKuma: {
    documentationSlug: "uptime-kuma",
    defaultSize: { width: 2, height: 3 },
    displayNameFromIntegration: true,
    capability: { integrations: ["uptimeKuma"] },
    query: { paths: [["widget", "uptimeKuma"]] },
  },
  audioStats: {
    documentationSlug: "audio-stats",
    defaultSize: { width: 2, height: 2 },
    capability: { integrations: ["navidrome", "audiobookshelf"], serverMaxIntegrations: 1 },
    query: {
      paths: [
        ["widget", "audioStats", "getStats"],
        ["widget", "mediaServer", "getCurrentStreams"],
      ],
    },
  },
  umami: {
    documentationSlug: "umami",
    capability: { integrations: ["umami"], serverMaxIntegrations: 1 },
    query: {
      paths: [
        ["widget", "umami", "getVisitorStats"],
        ["widget", "umami", "getActiveVisitors"],
        ["widget", "umami", "getMultiEventTimeSeries"],
        ["widget", "umami", "getTopPages"],
        ["widget", "umami", "getTopReferrers"],
      ],
      refetchIntervalSeconds: null,
    },
  },
  vpn: {
    documentationSlug: "vpn",
    capability: { integrations: getIntegrationKindsByCategory("vpn") },
    query: { paths: [["widget", "vpn"]], refetchIntervalSeconds: null },
  },
  archiveTeamWarrior: {
    documentationSlug: null,
    capability: { integrations: ["archiveTeamWarrior"], serverMaxIntegrations: 1 },
    query: { paths: [["widget", "archiveTeamWarrior"]] },
  },
  ups: {
    documentationSlug: "ups",
    capability: { integrations: getIntegrationKindsByCategory("ups") },
    query: { paths: [["widget", "ups"]] },
  },
  beszelSystemTable: {
    documentationSlug: "beszel-system-table",
    capability: { integrations: ["beszel", "mock"] },
    query: {
      paths: [
        ["widget", "beszel", "getSystems"],
        ["widget", "beszel", "getSystemStats"],
      ],
    },
  },
  beszelSystemGrid: {
    documentationSlug: "beszel-system-grid",
    capability: { integrations: ["beszel", "mock"] },
    query: {
      paths: [
        ["widget", "beszel", "getSystems"],
        ["widget", "beszel", "getSystemStats"],
      ],
    },
  },
  beszelAlerts: {
    documentationSlug: "beszel-alerts",
    capability: { integrations: ["beszel", "mock"] },
    query: { paths: [["widget", "beszel", "getAlerts"]] },
  },
  beszelSystemStats: {
    documentationSlug: "beszel-system-stats",
    capability: { integrations: ["beszel", "mock"] },
    query: {
      paths: [
        ["widget", "beszel", "getSystems"],
        ["widget", "beszel", "getSystemStats"],
      ],
    },
  },
  traefik: {
    documentationSlug: "traefik",
    displayNameFromIntegration: true,
    capability: { integrations: ["traefik"] },
    query: { paths: [["widget", "traefik"]] },
  },
  customApi: {
    documentationSlug: "custom-api",
    query: { paths: [["widget", "customApi"]] },
  },
  assistant: { documentationSlug: "assistant", defaultSize: { width: 10, height: 4 } },
  wud: {
    documentationSlug: "whats-up-docker",
    capability: { integrations: ["wud"], serverMaxIntegrations: 1 },
    query: { paths: [["widget", "wud"]], refetchIntervalSeconds: null },
  },
  ...additionalGeneratedWidgetFeatures,
});

export type WidgetFeatureKind = keyof typeof widgetFeatureCatalog;

export type WidgetIntegrationKind<TKind extends WidgetFeatureKind> = (typeof widgetFeatureCatalog)[TKind] extends {
  capability: { integrations: readonly (infer TIntegrationKind extends IntegrationKind)[] };
}
  ? TIntegrationKind
  : never;

export type WidgetKindWithIntegration = {
  [TKind in WidgetFeatureKind]: WidgetIntegrationKind<TKind> extends never ? never : TKind;
}[WidgetFeatureKind];

export const getWidgetFeatureIntegrationKinds = <TKind extends WidgetKindWithIntegration>(
  kind: TKind,
): AtLeastOneOf<WidgetIntegrationKind<TKind>> => {
  const descriptor = widgetFeatureCatalog[kind];
  if (!("capability" in descriptor) || descriptor.capability.integrations.length === 0) {
    throw new Error(`Widget kind ${kind} does not declare integration support`);
  }

  return [...descriptor.capability.integrations] as AtLeastOneOf<WidgetIntegrationKind<TKind>>;
};
