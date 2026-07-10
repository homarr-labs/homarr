import { createDocumentationLink } from "./docs";
import type { IntegrationKind } from "./integration";
import { getIntegrationKindsByCategory } from "./integration";
import type { WidgetKind } from "./widget";

/**
 * Static mapping of widget kinds to the integration kinds they support.
 * Mirrors the supportedIntegrations declared in each widget definition
 * but lives in @homarr/definitions so server-side code (API layer)
 * can use it without importing @homarr/widgets.
 */
export const widgetIntegrationSupport: Partial<Record<WidgetKind, readonly IntegrationKind[]>> = {
  dnsHoleSummary: getIntegrationKindsByCategory("dnsHole"),
  dnsHoleControls: getIntegrationKindsByCategory("dnsHole"),
  "smartHome-entityState": getIntegrationKindsByCategory("smartHomeServer"),
  "smartHome-executeAutomation": getIntegrationKindsByCategory("smartHomeServer"),
  mediaServer: getIntegrationKindsByCategory("mediaService"),
  calendar: getIntegrationKindsByCategory("calendar"),
  downloads: getIntegrationKindsByCategory("downloadClient"),
  "mediaRequests-requestList": getIntegrationKindsByCategory("mediaRequest"),
  "mediaRequests-requestStats": getIntegrationKindsByCategory("mediaRequest"),
  mediaTranscoding: getIntegrationKindsByCategory("mediaTranscoding"),
  mediaMissing: getIntegrationKindsByCategory("mediaOrganizer"),
  networkControllerSummary: getIntegrationKindsByCategory("networkController"),
  networkControllerStatus: getIntegrationKindsByCategory("networkController"),
  indexerManager: getIntegrationKindsByCategory("indexerManager"),
  healthMonitoring: getIntegrationKindsByCategory("healthMonitoring").filter((kind) => kind !== "patchmon"),
  firewall: getIntegrationKindsByCategory("firewall"),
  notifications: getIntegrationKindsByCategory("notifications"),
  mediaReleases: ["emby", "jellyfin", "plex"],
  systemResources: ["dashDot", "openmediavault", "truenas", "unraid", "glances", "synology"],
  systemDisks: ["dashDot", "openmediavault", "truenas", "unraid", "synology"],
  coolify: ["coolify"],
  "immich-serverStats": ["immich"],
  "immich-albumCarousel": ["immich"],
  paperlessNgx: ["paperlessNgx"],
  patchmon: ["patchmon"],
  bazarr: ["bazarr"],
  tracearr: ["tracearr"],
  speedtestTracker: ["speedtestTracker"],
  uptimeKuma: ["uptimeKuma"],
  audioStats: ["navidrome", "audiobookshelf"],
  vpn: getIntegrationKindsByCategory("vpn"),
  archiveTeamWarrior: ["archiveTeamWarrior"],
  anchorNote: ["anchor"],
  traefik: ["traefik"],
};

export const getWidgetKindsForIntegration = (integrationKind: IntegrationKind): WidgetKind[] => {
  const result: WidgetKind[] = [];
  for (const [widgetKind, supportedIntegrations] of Object.entries(widgetIntegrationSupport)) {
    if (supportedIntegrations.includes(integrationKind)) {
      result.push(widgetKind as WidgetKind);
    }
  }
  return result;
};

export interface DefaultWidgetConfig {
  kind: WidgetKind;
  width: number;
  height: number;
  options?: Record<string, unknown>;
  skip?: boolean;
}

export const defaultWidgetConfigs: DefaultWidgetConfig[] = [
  { kind: "clock", width: 2, height: 1 },
  { kind: "weather", width: 2, height: 1, options: { showCity: true, hasForecast: true, forecastDayCount: 3 } },
  { kind: "bookmarks", width: 2, height: 2, options: { title: "Useful Links", layout: "grid", openNewTab: true } },
];

export const generalWidgets: WidgetKind[] = defaultWidgetConfigs
  .filter((config) => !config.skip)
  .map((config) => config.kind);

export const featuredIntegrations: readonly IntegrationKind[] = [
  "sonarr",
  "radarr",
  "prowlarr",
  "sabNzbd",
  "qBittorrent",
  "seerr",
  "jellyfin",
];

export const hiddenFromOnboarding = new Set<IntegrationKind>(["mock"]);

export const defaultBookmarkApps = [
  {
    name: "Homarr Docs",
    href: createDocumentationLink("/docs/getting-started"),
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr.svg",
  },
  {
    name: "Homarr GitHub",
    href: "https://github.com/homarr-labs/homarr",
    iconUrl: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@master/svg/github.svg",
  },
  {
    name: "Help Translate",
    href: createDocumentationLink("/docs/community/translations"),
    iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr.svg",
  },
  {
    name: "Support Homarr",
    href: "https://opencollective.com/homarr",
    iconUrl: "https://cdn.jsdelivr.net/gh/loganmarchione/homelab-svg-assets@latest/assets/opencollective.svg",
  },
];
