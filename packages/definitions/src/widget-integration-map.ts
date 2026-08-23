import { createDocumentationLink } from "./docs";
import type { IntegrationKind } from "./integration";
import { integrationKinds } from "./integration";
import type { WidgetKind } from "./widget";
import { widgetDefaultSizes, widgetFeatureCatalog, widgetKinds } from "./widget";
import type { NativeFeatureCapabilityDescriptor } from "./widget-feature-catalog";

export type { NativeFeatureCapabilityDescriptor } from "./widget-feature-catalog";

const createNativeFeatureCapabilities = () => {
  const result: Partial<Record<WidgetKind, NativeFeatureCapabilityDescriptor>> = {};
  for (const kind of widgetKinds) {
    const descriptor = widgetFeatureCatalog[kind];
    if ("capability" in descriptor) result[kind] = descriptor.capability;
  }
  return result;
};

export const nativeFeatureCapabilities = createNativeFeatureCapabilities();

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

type WidgetKindWithDefaultSize = {
  [TKind in WidgetKind]: (typeof widgetFeatureCatalog)[TKind] extends { defaultSize: Readonly<{ width: number }> }
    ? TKind
    : never;
}[WidgetKind];

type DefaultWidgetConfigRecipe = Omit<DefaultWidgetConfig, "kind" | "width" | "height"> & {
  kind: WidgetKindWithDefaultSize;
};

const defaultWidgetConfigDefinitions: DefaultWidgetConfigRecipe[] = [
  { kind: "clock" },
  { kind: "weather", options: { showHumidity: false, showCity: false, hasForecast: false } },
  { kind: "bookmarks", options: { title: "Useful Links", layout: "grid", openNewTab: true } },
];

export const defaultWidgetConfigs: DefaultWidgetConfig[] = defaultWidgetConfigDefinitions.map((recipe) => {
  const defaultSize = widgetDefaultSizes[recipe.kind];
  if (!defaultSize) throw new Error(`Default widget ${recipe.kind} must declare a default size`);
  return { ...recipe, ...defaultSize };
});

const defaultWidgetConfigByKind = new Map(defaultWidgetConfigs.map((config) => [config.kind, config]));

export const getDefaultWidgetConfig = (kind: WidgetKind): DefaultWidgetConfig =>
  defaultWidgetConfigByKind.get(kind) ?? { kind, ...(widgetDefaultSizes[kind] ?? { width: 1, height: 1 }) };

export const generalWidgets: WidgetKind[] = defaultWidgetConfigs
  .filter((config) => !config.skip)
  .map((config) => config.kind);

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
