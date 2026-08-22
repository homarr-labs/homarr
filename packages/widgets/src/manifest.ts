import type { ComponentType } from "react";

import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";

import type { WidgetComponentProps, WidgetDefinition } from "./definition";
import type { WidgetOptionDefinition } from "./options";

type WidgetModule = {
  definition: WidgetDefinition;
  componentLoader: () => Promise<{ default: ComponentType<WidgetComponentProps<WidgetKind>> }>;
};

type WidgetComponentModule = {
  default: ComponentType<WidgetComponentProps<WidgetKind>>;
};

export type WidgetResources = {
  definition: WidgetDefinition;
  Component: ComponentType<WidgetComponentProps<WidgetKind>>;
};

const moduleLoaders: Record<WidgetKind, () => Promise<WidgetModule>> = {
  clock: () => import("./clock") as Promise<WidgetModule>,
  weather: () => import("./weather") as Promise<WidgetModule>,
  airQuality: () => import("./air-quality") as Promise<WidgetModule>,
  countdown: () => import("./countdown") as Promise<WidgetModule>,
  timer: () => import("./timer") as Promise<WidgetModule>,
  app: () => import("./app") as Promise<WidgetModule>,
  assistant: () => import("./assistant") as Promise<WidgetModule>,
  archiveTeamWarrior: () => import("./archive-team-warrior") as Promise<WidgetModule>,
  anchorNote: () => import("./anchor-note") as Promise<WidgetModule>,
  notebook: () => import("./notebook") as Promise<WidgetModule>,
  iframe: () => import("./iframe") as Promise<WidgetModule>,
  video: () => import("./video") as Promise<WidgetModule>,
  dnsHoleSummary: () => import("./dns-hole/summary") as Promise<WidgetModule>,
  dnsHoleControls: () => import("./dns-hole/controls") as Promise<WidgetModule>,
  "smartHome-entityState": () => import("./smart-home/entity-state") as Promise<WidgetModule>,
  "smartHome-executeAutomation": () => import("./smart-home/execute-automation") as Promise<WidgetModule>,
  stockPrice: () => import("./stocks") as Promise<WidgetModule>,
  mediaServer: () => import("./media-server") as Promise<WidgetModule>,
  calendar: () => import("./calendar") as Promise<WidgetModule>,
  downloads: () => import("./downloads") as Promise<WidgetModule>,
  "mediaRequests-requestList": () => import("./media-requests/list") as Promise<WidgetModule>,
  "mediaRequests-requestStats": () => import("./media-requests/stats") as Promise<WidgetModule>,
  mediaMissing: () => import("./media-missing") as Promise<WidgetModule>,
  networkControllerSummary: () => import("./network-controller/summary") as Promise<WidgetModule>,
  networkControllerStatus: () => import("./network-controller/network-status") as Promise<WidgetModule>,
  rssFeed: () => import("./rssFeed") as Promise<WidgetModule>,
  bookmarks: () => import("./bookmarks") as Promise<WidgetModule>,
  bazarr: () => import("./bazarr") as Promise<WidgetModule>,
  indexerManager: () => import("./indexer-manager") as Promise<WidgetModule>,
  healthMonitoring: () => import("./health-monitoring") as Promise<WidgetModule>,
  mediaTranscoding: () => import("./media-transcoding") as Promise<WidgetModule>,
  minecraftServerStatus: () => import("./minecraft/server-status") as Promise<WidgetModule>,
  dockerContainers: () => import("./docker") as Promise<WidgetModule>,
  releases: () => import("./releases") as Promise<WidgetModule>,
  firewall: () => import("./firewall") as Promise<WidgetModule>,
  notifications: () => import("./notifications") as Promise<WidgetModule>,
  mediaReleases: () => import("./media-releases") as Promise<WidgetModule>,
  systemResources: () => import("./system-resources") as Promise<WidgetModule>,
  coolify: () => import("./coolify") as Promise<WidgetModule>,
  systemDisks: () => import("./system-disks") as Promise<WidgetModule>,
  timetable: () => import("./timetable") as Promise<WidgetModule>,
  "immich-serverStats": () => import("./immich/server-stats") as Promise<WidgetModule>,
  "immich-albumCarousel": () => import("./immich/album-carousel") as Promise<WidgetModule>,
  paperlessNgx: () => import("./paperless-ngx") as Promise<WidgetModule>,
  patchmon: () => import("./patchmon") as Promise<WidgetModule>,
  tracearr: () => import("./tracearr") as Promise<WidgetModule>,
  speedtestTracker: () => import("./speedtest-tracker") as Promise<WidgetModule>,
  uptimeKuma: () => import("./uptime-kuma") as Promise<WidgetModule>,
  audioStats: () => import("./audio-stats") as Promise<WidgetModule>,
  umami: () => import("./umami") as Promise<WidgetModule>,
  vpn: () => import("./vpn") as Promise<WidgetModule>,
  ups: () => import("./ups") as Promise<WidgetModule>,
  beszelSystemTable: () => import("./beszel-system-table") as Promise<WidgetModule>,
  beszelSystemGrid: () => import("./beszel-system-grid") as Promise<WidgetModule>,
  beszelAlerts: () => import("./beszel-alerts") as Promise<WidgetModule>,
  beszelSystemStats: () => import("./beszel-system-stats") as Promise<WidgetModule>,
  traefik: () => import("./traefik") as Promise<WidgetModule>,
  customApi: () => import("./custom-api") as Promise<WidgetModule>,
  wud: () => import("./wud") as Promise<WidgetModule>,
};

// Keep these imports explicit so Turbopack can create one discoverable chunk per
// widget implementation. Loading this registry does not load the implementations.
const componentLoaders: Record<WidgetKind, () => Promise<WidgetComponentModule>> = {
  clock: () => import("./clock/component") as Promise<WidgetComponentModule>,
  weather: () => import("./weather/component") as Promise<WidgetComponentModule>,
  airQuality: () => import("./air-quality/component") as Promise<WidgetComponentModule>,
  countdown: () => import("./countdown/component") as Promise<WidgetComponentModule>,
  timer: () => import("./timer/component") as Promise<WidgetComponentModule>,
  app: () => import("./app/component") as Promise<WidgetComponentModule>,
  assistant: () => import("./assistant/component") as Promise<WidgetComponentModule>,
  archiveTeamWarrior: () => import("./archive-team-warrior/component") as Promise<WidgetComponentModule>,
  anchorNote: () => import("./anchor-note/component") as Promise<WidgetComponentModule>,
  notebook: () => import("./notebook/component") as Promise<WidgetComponentModule>,
  iframe: () => import("./iframe/component") as Promise<WidgetComponentModule>,
  video: () => import("./video/component") as Promise<WidgetComponentModule>,
  dnsHoleSummary: () => import("./dns-hole/summary/component") as Promise<WidgetComponentModule>,
  dnsHoleControls: () => import("./dns-hole/controls/component") as Promise<WidgetComponentModule>,
  "smartHome-entityState": () => import("./smart-home/entity-state/component") as Promise<WidgetComponentModule>,
  "smartHome-executeAutomation": () =>
    import("./smart-home/execute-automation/component") as Promise<WidgetComponentModule>,
  stockPrice: () => import("./stocks/component") as Promise<WidgetComponentModule>,
  mediaServer: () => import("./media-server/component") as Promise<WidgetComponentModule>,
  calendar: () => import("./calendar/component") as Promise<WidgetComponentModule>,
  downloads: () => import("./downloads/component") as Promise<WidgetComponentModule>,
  "mediaRequests-requestList": () => import("./media-requests/list/component") as Promise<WidgetComponentModule>,
  "mediaRequests-requestStats": () => import("./media-requests/stats/component") as Promise<WidgetComponentModule>,
  mediaMissing: () => import("./media-missing/component") as Promise<WidgetComponentModule>,
  networkControllerSummary: () => import("./network-controller/summary/component") as Promise<WidgetComponentModule>,
  networkControllerStatus: () =>
    import("./network-controller/network-status/component") as Promise<WidgetComponentModule>,
  rssFeed: () => import("./rssFeed/component") as Promise<WidgetComponentModule>,
  bookmarks: () => import("./bookmarks/component") as Promise<WidgetComponentModule>,
  bazarr: () => import("./bazarr/component") as Promise<WidgetComponentModule>,
  indexerManager: () => import("./indexer-manager/component") as Promise<WidgetComponentModule>,
  healthMonitoring: () => import("./health-monitoring/component") as Promise<WidgetComponentModule>,
  mediaTranscoding: () => import("./media-transcoding/component") as Promise<WidgetComponentModule>,
  minecraftServerStatus: () => import("./minecraft/server-status/component") as Promise<WidgetComponentModule>,
  dockerContainers: () => import("./docker/component") as Promise<WidgetComponentModule>,
  releases: () => import("./releases/component") as Promise<WidgetComponentModule>,
  firewall: () => import("./firewall/component") as Promise<WidgetComponentModule>,
  notifications: () => import("./notifications/component") as Promise<WidgetComponentModule>,
  mediaReleases: () => import("./media-releases/component") as Promise<WidgetComponentModule>,
  systemResources: () => import("./system-resources/component") as Promise<WidgetComponentModule>,
  coolify: () => import("./coolify/component") as Promise<WidgetComponentModule>,
  systemDisks: () => import("./system-disks/component") as Promise<WidgetComponentModule>,
  timetable: () => import("./timetable/component") as Promise<WidgetComponentModule>,
  "immich-serverStats": () => import("./immich/server-stats/component") as Promise<WidgetComponentModule>,
  "immich-albumCarousel": () => import("./immich/album-carousel/component") as Promise<WidgetComponentModule>,
  paperlessNgx: () => import("./paperless-ngx/component") as Promise<WidgetComponentModule>,
  patchmon: () => import("./patchmon/component") as Promise<WidgetComponentModule>,
  tracearr: () => import("./tracearr/component") as Promise<WidgetComponentModule>,
  speedtestTracker: () => import("./speedtest-tracker/component") as Promise<WidgetComponentModule>,
  uptimeKuma: () => import("./uptime-kuma/component") as Promise<WidgetComponentModule>,
  audioStats: () => import("./audio-stats/component") as Promise<WidgetComponentModule>,
  umami: () => import("./umami/component") as Promise<WidgetComponentModule>,
  vpn: () => import("./vpn/component") as Promise<WidgetComponentModule>,
  ups: () => import("./ups/component") as Promise<WidgetComponentModule>,
  beszelSystemTable: () => import("./beszel-system-table/component") as Promise<WidgetComponentModule>,
  beszelSystemGrid: () => import("./beszel-system-grid/component") as Promise<WidgetComponentModule>,
  beszelAlerts: () => import("./beszel-alerts/component") as Promise<WidgetComponentModule>,
  beszelSystemStats: () => import("./beszel-system-stats/component") as Promise<WidgetComponentModule>,
  traefik: () => import("./traefik/component") as Promise<WidgetComponentModule>,
  customApi: () => import("./custom-api/component") as Promise<WidgetComponentModule>,
  wud: () => import("./wud/component") as Promise<WidgetComponentModule>,
};

const definitionPromises = new Map<WidgetKind, Promise<WidgetDefinition>>();

export const widgetKinds = Object.keys(moduleLoaders) as WidgetKind[];

export const createRetryableLoader = <TKey, TValue>(loaders: ReadonlyMap<TKey, () => Promise<TValue>>) => {
  const promises = new Map<TKey, Promise<TValue>>();

  return (key: TKey) => {
    const existing = promises.get(key);
    if (existing) return existing;

    const loader = loaders.get(key);
    if (!loader) throw new Error(`No loader is registered for ${String(key)}`);

    const promise = loader();
    promises.set(key, promise);
    void promise.catch(() => {
      if (promises.get(key) === promise) promises.delete(key);
    });
    return promise;
  };
};

export const loadWidgetModule = createRetryableLoader(
  new Map(Object.entries(moduleLoaders) as [WidgetKind, () => Promise<WidgetModule>][]),
);

export const loadWidgetComponent = createRetryableLoader(
  new Map(Object.entries(componentLoaders) as [WidgetKind, () => Promise<WidgetComponentModule>][]),
);

export const loadWidgetResources = createRetryableLoader(
  new Map(
    (Object.keys(moduleLoaders) as WidgetKind[]).map((kind) => [
      kind,
      async () => {
        const [{ definition }, { default: Component }] = await Promise.all([
          loadWidgetModule(kind),
          loadWidgetComponent(kind),
        ]);
        return { definition, Component } satisfies WidgetResources;
      },
    ]),
  ),
);

export const loadWidgetDefinition = (kind: WidgetKind) => {
  const existing = definitionPromises.get(kind);
  if (existing) return existing;

  const promise = loadWidgetModule(kind).then(({ definition }) => definition);
  definitionPromises.set(kind, promise);
  void promise.catch(() => {
    if (definitionPromises.get(kind) === promise) definitionPromises.delete(kind);
  });
  return promise;
};

let allWidgetDefinitionsPromise: Promise<Map<WidgetKind, WidgetDefinition>> | undefined;

export const loadAllWidgetDefinitions = () => {
  if (allWidgetDefinitionsPromise) return allWidgetDefinitionsPromise;

  const promise = Promise.all(widgetKinds.map(async (kind) => [kind, await loadWidgetDefinition(kind)] as const)).then(
    (entries) => new Map(entries),
  );
  allWidgetDefinitionsPromise = promise;
  void promise.catch(() => {
    if (allWidgetDefinitionsPromise === promise) allWidgetDefinitionsPromise = undefined;
  });

  return promise;
};

export const reduceWidgetOptionsWithDefinition = (
  definition: WidgetDefinition,
  settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">,
  currentValue: Record<string, unknown> = {},
) => {
  const options = definition.createOptions(settings) as Record<string, WidgetOptionDefinition>;
  return objectEntries(options).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: currentValue[key] ?? value.defaultValue,
    }),
    {} as Record<string, unknown>,
  );
};
