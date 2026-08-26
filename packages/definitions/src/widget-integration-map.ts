import { objectEntries } from "@homarr/common";

import { createDocumentationLink } from "./docs";
import type { IntegrationKind } from "./integration";
import { getIntegrationKindsByCategory, integrationKinds } from "./integration";
import type { WidgetKind } from "./widget";
import { widgetDefaultSizes } from "./widget";

/** Integration selection shared by the widget UI and API trust boundary. */
export interface WidgetIntegrationConfig {
  supportedIntegrations: IntegrationKind[];
  integrationsRequired?: false;
  maxIntegrations?: number;
}

const healthMonitoringGeneralIntegrationKinds = [
  "openmediavault",
  "dashDot",
  "truenas",
  "unraid",
  "glances",
  "synology",
] as const satisfies readonly IntegrationKind[];

export const healthMonitoringSystemIntegrationKinds = [
  ...healthMonitoringGeneralIntegrationKinds,
  "mock",
] as const satisfies readonly IntegrationKind[];

export const healthMonitoringClusterIntegrationKinds = [
  "proxmox",
  "mock",
] as const satisfies readonly IntegrationKind[];

export const widgetIntegrationConfigs = {
  dnsHoleSummary: { supportedIntegrations: getIntegrationKindsByCategory("dnsHole") },
  dnsHoleControls: { supportedIntegrations: getIntegrationKindsByCategory("dnsHole") },
  "smartHome-entityState": {
    supportedIntegrations: getIntegrationKindsByCategory("smartHomeServer"),
    maxIntegrations: 1,
  },
  "smartHome-executeAutomation": {
    supportedIntegrations: getIntegrationKindsByCategory("smartHomeServer"),
    maxIntegrations: 1,
  },
  mediaServer: { supportedIntegrations: getIntegrationKindsByCategory("mediaService") },
  calendar: { supportedIntegrations: getIntegrationKindsByCategory("calendar"), integrationsRequired: false },
  downloads: { supportedIntegrations: getIntegrationKindsByCategory("downloadClient") },
  "mediaRequests-requestList": { supportedIntegrations: getIntegrationKindsByCategory("mediaRequest") },
  "mediaRequests-requestStats": { supportedIntegrations: getIntegrationKindsByCategory("mediaRequest") },
  mediaTranscoding: {
    supportedIntegrations: getIntegrationKindsByCategory("mediaTranscoding"),
    maxIntegrations: 1,
  },
  mediaMissing: { supportedIntegrations: getIntegrationKindsByCategory("mediaOrganizer") },
  networkControllerSummary: { supportedIntegrations: getIntegrationKindsByCategory("networkController") },
  networkControllerStatus: { supportedIntegrations: getIntegrationKindsByCategory("networkController") },
  indexerManager: { supportedIntegrations: getIntegrationKindsByCategory("indexerManager") },
  healthMonitoring: {
    supportedIntegrations: [...healthMonitoringGeneralIntegrationKinds, ...healthMonitoringClusterIntegrationKinds],
  },
  firewall: { supportedIntegrations: [...getIntegrationKindsByCategory("firewall"), "mock"] },
  notifications: { supportedIntegrations: getIntegrationKindsByCategory("notifications") },
  mediaReleases: { supportedIntegrations: ["mock", "emby", "jellyfin", "plex"] },
  systemResources: {
    supportedIntegrations: [...healthMonitoringSystemIntegrationKinds],
  },
  systemDisks: { supportedIntegrations: ["dashDot", "openmediavault", "truenas", "unraid", "synology", "mock"] },
  beszelAlerts: { supportedIntegrations: ["beszel", "mock"] },
  beszelSystemGrid: { supportedIntegrations: ["beszel", "mock"] },
  beszelSystemStats: { supportedIntegrations: ["beszel", "mock"] },
  beszelSystemTable: { supportedIntegrations: ["beszel", "mock"] },
  coolify: { supportedIntegrations: ["coolify", "mock"] },
  "immich-serverStats": { supportedIntegrations: ["immich", "mock"], maxIntegrations: 1 },
  "immich-albumCarousel": { supportedIntegrations: ["immich", "mock"], maxIntegrations: 1 },
  paperlessNgx: { supportedIntegrations: ["paperlessNgx", "mock"], maxIntegrations: 1 },
  patchmon: { supportedIntegrations: ["patchmon", "mock"], maxIntegrations: 1 },
  bazarr: { supportedIntegrations: ["bazarr", "mock"], maxIntegrations: 1 },
  tracearr: { supportedIntegrations: ["tracearr", "mock"] },
  speedtestTracker: { supportedIntegrations: ["speedtestTracker", "mock"] },
  uptimeKuma: { supportedIntegrations: ["uptimeKuma", "mock"] },
  audioStats: { supportedIntegrations: ["navidrome", "audiobookshelf", "mock"], maxIntegrations: 1 },
  umami: { supportedIntegrations: ["umami", "mock"], maxIntegrations: 1 },
  vpn: { supportedIntegrations: [...getIntegrationKindsByCategory("vpn"), "mock"] },
  ups: { supportedIntegrations: getIntegrationKindsByCategory("ups") },
  archiveTeamWarrior: { supportedIntegrations: ["archiveTeamWarrior", "mock"], maxIntegrations: 1 },
  anchorNote: { supportedIntegrations: ["anchor", "mock"], maxIntegrations: 1 },
  traefik: { supportedIntegrations: ["traefik", "mock"] },
  wud: { supportedIntegrations: ["wud", "mock"], maxIntegrations: 1 },
} satisfies Partial<Record<WidgetKind, WidgetIntegrationConfig>>;

export type WidgetKindWithIntegration = keyof typeof widgetIntegrationConfigs;

export type WidgetIntegrationKind<TKind extends WidgetKindWithIntegration> =
  (typeof widgetIntegrationConfigs)[TKind]["supportedIntegrations"][number];

export const getWidgetIntegrationConfig = <TKind extends WidgetKindWithIntegration>(
  kind: TKind,
): (typeof widgetIntegrationConfigs)[TKind] => widgetIntegrationConfigs[kind];

const widgetIntegrationConfigEntries = objectEntries(widgetIntegrationConfigs);

const createWidgetIntegrationSupport = () => {
  const result: Partial<Record<WidgetKind, readonly IntegrationKind[]>> = {};
  for (const [kind, config] of widgetIntegrationConfigEntries) result[kind] = config.supportedIntegrations;
  return result;
};

export const widgetIntegrationSupport = createWidgetIntegrationSupport();

/** Widgets that remain useful without a configured integration. */
export const widgetKindsWithOptionalIntegrations = new Set<WidgetKind>(
  widgetIntegrationConfigEntries
    .filter(([, config]) => "integrationsRequired" in config && config.integrationsRequired === false)
    .map(([kind]) => kind),
);

const createWidgetIntegrationLimits = () => {
  const result: Partial<Record<WidgetKind, number>> = {};
  for (const [kind, config] of widgetIntegrationConfigEntries) {
    if ("maxIntegrations" in config) result[kind] = config.maxIntegrations;
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
  selectedIntegrationKinds: readonly IntegrationKind[],
): WidgetIntegrationIssue | null => {
  const supportedIntegrations = widgetIntegrationSupport[widgetKind];
  const integrationLimit = widgetIntegrationLimits[widgetKind] ?? Number.POSITIVE_INFINITY;
  if (selectedIntegrationKinds.length > integrationLimit) {
    return { code: "integration-limit", limit: integrationLimit };
  }
  if (supportedIntegrations === undefined && selectedIntegrationKinds.length > 0) {
    return { code: "integration-not-supported" };
  }
  if (
    supportedIntegrations !== undefined &&
    selectedIntegrationKinds.length === 0 &&
    !widgetKindsWithOptionalIntegrations.has(widgetKind)
  ) {
    return { code: "integration-required" };
  }
  const incompatibleKinds = selectedIntegrationKinds.filter((kind) => !supportedIntegrations?.includes(kind));
  if (incompatibleKinds.length === 0) return null;
  return { code: "incompatible-integration", incompatibleKinds };
};

export const getWidgetIntegrationIssueMessage = (widgetKind: WidgetKind, issue: WidgetIntegrationIssue) => {
  if (issue.code === "integration-limit") {
    return `${widgetKind} supports at most ${issue.limit} integration${issue.limit === 1 ? "" : "s"}`;
  }
  if (issue.code === "integration-not-supported") return `${widgetKind} does not support integrations`;
  if (issue.code === "integration-required") return `${widgetKind} requires an integration`;
  return `${widgetKind} does not support integration kind${issue.incompatibleKinds.length === 1 ? "" : "s"}: ${issue.incompatibleKinds.join(", ")}`;
};

const createIntegrationWidgetSupport = () => {
  const result = {} as Record<IntegrationKind, readonly WidgetKind[]>;
  for (const integrationKind of integrationKinds) {
    result[integrationKind] = widgetIntegrationConfigEntries
      .filter(([, config]) => supportsIntegration(config, integrationKind))
      .map(([widgetKind]) => widgetKind);
  }
  return result;
};

const supportsIntegration = (config: WidgetIntegrationConfig, integrationKind: IntegrationKind) =>
  config.supportedIntegrations.includes(integrationKind);

export const integrationWidgetSupport = createIntegrationWidgetSupport();

export const getWidgetKindsForIntegration = (integrationKind: IntegrationKind): WidgetKind[] => {
  return [...integrationWidgetSupport[integrationKind]];
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
  { kind: "weather", width: 2, height: 1, options: { showHumidity: false, showCity: false, hasForecast: false } },
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
