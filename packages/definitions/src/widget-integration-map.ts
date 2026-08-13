import { createDocumentationLink } from "./docs";
import type { IntegrationKind } from "./integration";
import { getIntegrationKindsByCategory, integrationKinds } from "./integration";
import type { WidgetKind } from "./widget";
import { widgetDefaultSizes } from "./widget";

/**
 * Server-safe capability metadata shared by the API and widget catalog.
 * Keep this intentionally small: presentation, options, and request contracts
 * remain owned by their feature packages.
 */
export interface NativeFeatureCapabilityDescriptor {
  integrations: readonly IntegrationKind[];
  connectionOptional?: true;
  serverMaxIntegrations?: number;
}

export const nativeFeatureCapabilities = {
  dnsHoleSummary: { integrations: getIntegrationKindsByCategory("dnsHole") },
  dnsHoleControls: { integrations: getIntegrationKindsByCategory("dnsHole") },
  "smartHome-entityState": {
    integrations: getIntegrationKindsByCategory("smartHomeServer"),
    serverMaxIntegrations: 1,
  },
  "smartHome-executeAutomation": {
    integrations: getIntegrationKindsByCategory("smartHomeServer"),
    serverMaxIntegrations: 1,
  },
  mediaServer: { integrations: getIntegrationKindsByCategory("mediaService") },
  calendar: { integrations: getIntegrationKindsByCategory("calendar"), connectionOptional: true },
  downloads: { integrations: getIntegrationKindsByCategory("downloadClient") },
  "mediaRequests-requestList": { integrations: getIntegrationKindsByCategory("mediaRequest") },
  "mediaRequests-requestStats": { integrations: getIntegrationKindsByCategory("mediaRequest") },
  mediaTranscoding: { integrations: getIntegrationKindsByCategory("mediaTranscoding"), serverMaxIntegrations: 1 },
  mediaMissing: { integrations: getIntegrationKindsByCategory("mediaOrganizer") },
  networkControllerSummary: { integrations: getIntegrationKindsByCategory("networkController") },
  networkControllerStatus: { integrations: getIntegrationKindsByCategory("networkController") },
  indexerManager: { integrations: getIntegrationKindsByCategory("indexerManager") },
  healthMonitoring: {
    integrations: getIntegrationKindsByCategory("healthMonitoring").filter(
      (kind) => kind !== "patchmon" && kind !== "wud",
    ),
  },
  firewall: { integrations: getIntegrationKindsByCategory("firewall") },
  notifications: { integrations: getIntegrationKindsByCategory("notifications") },
  mediaReleases: { integrations: ["mock", "emby", "jellyfin", "plex"] },
  systemResources: { integrations: ["dashDot", "openmediavault", "truenas", "unraid", "glances", "synology"] },
  systemDisks: { integrations: ["dashDot", "openmediavault", "truenas", "unraid", "synology"] },
  beszelAlerts: { integrations: ["beszel", "mock"] },
  beszelSystemGrid: { integrations: ["beszel", "mock"] },
  beszelSystemStats: { integrations: ["beszel", "mock"] },
  beszelSystemTable: { integrations: ["beszel", "mock"] },
  coolify: { integrations: ["coolify"] },
  "immich-serverStats": { integrations: ["immich"], serverMaxIntegrations: 1 },
  "immich-albumCarousel": { integrations: ["immich"], serverMaxIntegrations: 1 },
  paperlessNgx: { integrations: ["paperlessNgx"], serverMaxIntegrations: 1 },
  patchmon: { integrations: ["patchmon"], serverMaxIntegrations: 1 },
  bazarr: { integrations: ["bazarr"], serverMaxIntegrations: 1 },
  tracearr: { integrations: ["tracearr"] },
  speedtestTracker: { integrations: ["speedtestTracker"] },
  uptimeKuma: { integrations: ["uptimeKuma"] },
  audioStats: { integrations: ["navidrome", "audiobookshelf"], serverMaxIntegrations: 1 },
  umami: { integrations: ["umami"], serverMaxIntegrations: 1 },
  vpn: { integrations: getIntegrationKindsByCategory("vpn") },
  ups: { integrations: getIntegrationKindsByCategory("ups") },
  archiveTeamWarrior: { integrations: ["archiveTeamWarrior"], serverMaxIntegrations: 1 },
  anchorNote: { integrations: ["anchor"], serverMaxIntegrations: 1 },
  traefik: { integrations: ["traefik"] },
  wud: { integrations: ["wud"], serverMaxIntegrations: 1 },
} as const satisfies Partial<Record<WidgetKind, NativeFeatureCapabilityDescriptor>>;

const nativeFeatureCapabilityEntries = Object.entries(nativeFeatureCapabilities) as [
  WidgetKind,
  NativeFeatureCapabilityDescriptor,
][];

const createWidgetIntegrationSupport = () => {
  const result: Partial<Record<WidgetKind, readonly IntegrationKind[]>> = {};
  for (const [kind, capability] of nativeFeatureCapabilityEntries) result[kind] = capability.integrations;
  return result;
};

export const widgetIntegrationSupport = createWidgetIntegrationSupport();

/** Widgets that remain useful without a configured integration. */
export const widgetKindsWithOptionalIntegrations = new Set<WidgetKind>(
  nativeFeatureCapabilityEntries
    .filter(([, capability]) => capability.connectionOptional === true)
    .map(([kind]) => kind),
);

/** Widgets that support fewer integrations than the default unlimited selection. */
const createWidgetIntegrationLimits = () => {
  const result: Partial<Record<WidgetKind, number>> = {};
  for (const [kind, capability] of nativeFeatureCapabilityEntries) {
    if (capability.serverMaxIntegrations !== undefined) result[kind] = capability.serverMaxIntegrations;
  }
  return result;
};

export const widgetIntegrationLimits = createWidgetIntegrationLimits();

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

/** Reverse capability index generated from nativeFeatureCapabilities. */
const createIntegrationWidgetSupport = () => {
  const result = {} as Record<IntegrationKind, readonly WidgetKind[]>;
  for (const integrationKind of integrationKinds) {
    result[integrationKind] = nativeFeatureCapabilityEntries
      .filter(([, capability]) => capability.integrations.includes(integrationKind))
      .map(([widgetKind]) => widgetKind);
  }
  return result;
};

export const integrationWidgetSupport = createIntegrationWidgetSupport();

export const getWidgetKindsForIntegration = (integrationKind: IntegrationKind): WidgetKind[] => [
  ...integrationWidgetSupport[integrationKind],
];

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
