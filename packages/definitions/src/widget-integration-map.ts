import { createDocumentationLink } from "./docs";
import type { IntegrationKind } from "./integration";
import { getIntegrationKindsByCategory } from "./integration";
import type { WidgetKind } from "./widget";
import { widgetDefaultSizes } from "./widget";

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
  healthMonitoring: getIntegrationKindsByCategory("healthMonitoring").filter(
    (kind) => kind !== "patchmon" && kind !== "wud",
  ),
  firewall: getIntegrationKindsByCategory("firewall"),
  notifications: getIntegrationKindsByCategory("notifications"),
  mediaReleases: ["mock", "emby", "jellyfin", "plex"],
  systemResources: ["dashDot", "openmediavault", "truenas", "unraid", "glances", "synology"],
  systemDisks: ["dashDot", "openmediavault", "truenas", "unraid", "synology"],
  beszelAlerts: ["beszel", "mock"],
  beszelSystemGrid: ["beszel", "mock"],
  beszelSystemStats: ["beszel", "mock"],
  beszelSystemTable: ["beszel", "mock"],
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
  umami: ["umami"],
  vpn: getIntegrationKindsByCategory("vpn"),
  ups: getIntegrationKindsByCategory("ups"),
  archiveTeamWarrior: ["archiveTeamWarrior"],
  anchorNote: ["anchor"],
  traefik: ["traefik"],
  wud: ["wud"],
};

/** Widgets that remain useful without a configured integration. */
export const widgetKindsWithOptionalIntegrations = new Set<WidgetKind>(["calendar"]);

/** Widgets that support fewer integrations than the default unlimited selection. */
export const widgetIntegrationLimits: Partial<Record<WidgetKind, number>> = {
  audioStats: 1,
};

export type WidgetIntegrationIssue =
  | { code: "integration-not-supported" }
  | { code: "integration-required" }
  | { code: "incompatible-integration"; incompatibleKinds: IntegrationKind[] }
  | { code: "integration-limit"; limit: number };

export const getWidgetIntegrationIssue = (
  widgetKind: WidgetKind,
  integrationKinds: readonly IntegrationKind[],
): WidgetIntegrationIssue | null => {
  const supportedIntegrations = widgetIntegrationSupport[widgetKind];
  const integrationLimit = widgetIntegrationLimits[widgetKind] ?? Number.POSITIVE_INFINITY;
  if (integrationKinds.length > integrationLimit) return { code: "integration-limit", limit: integrationLimit };
  if (supportedIntegrations === undefined && integrationKinds.length > 0) return { code: "integration-not-supported" };
  if (
    supportedIntegrations !== undefined &&
    integrationKinds.length === 0 &&
    !widgetKindsWithOptionalIntegrations.has(widgetKind)
  ) {
    return { code: "integration-required" };
  }
  const incompatibleKinds = integrationKinds.filter((kind) => !supportedIntegrations?.includes(kind));
  return incompatibleKinds.length > 0 ? { code: "incompatible-integration", incompatibleKinds } : null;
};

export const getWidgetIntegrationIssueMessage = (widgetKind: WidgetKind, issue: WidgetIntegrationIssue) => {
  if (issue.code === "integration-limit") {
    return `${widgetKind} supports at most ${issue.limit} integration${issue.limit === 1 ? "" : "s"}`;
  }
  if (issue.code === "integration-not-supported") return `${widgetKind} does not support integrations`;
  if (issue.code === "integration-required") return `${widgetKind} requires an integration`;
  return `${widgetKind} does not support integration kind${issue.incompatibleKinds.length === 1 ? "" : "s"}: ${issue.incompatibleKinds.join(", ")}`;
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

const defaultWidgetConfigByKind = new Map(defaultWidgetConfigs.map((config) => [config.kind, config]));

export const getDefaultWidgetConfig = (kind: WidgetKind): DefaultWidgetConfig =>
  defaultWidgetConfigByKind.get(kind) ?? { kind, ...(widgetDefaultSizes[kind] ?? { width: 1, height: 1 }) };

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
