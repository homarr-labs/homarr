import { objectEntries } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { widgetKinds as declaredWidgetKinds } from "@homarr/definitions";
import type { SettingsContextProps } from "@homarr/settings/creator";

import type { WidgetDefinition } from "./definition";
import type {
  CanonicalDefinitions,
  DefinitionResourcesFor,
  ResourceWidgetKind,
  WidgetDefinitionFor,
} from "./definition-registry";
import { widgetDefinitionModuleLoaders } from "./definition-registry";
import type { WidgetOptionDefinition } from "./options";

export type {
  CanonicalDefinitions,
  DefinitionResourcesFor,
  ResourceWidgetKind,
  WidgetDefinitionFor,
} from "./definition-registry";

type DefinitionResourceBinding<TResources> =
  | { status: "ready"; resources: TResources }
  | { status: "held"; reason: string };

export type DefinitionResourceBindings = {
  [TKind in ResourceWidgetKind]: DefinitionResourceBinding<DefinitionResourcesFor<TKind>>;
};

export interface WidgetDefinitionManifest {
  loadWidgetDefinition<TKind extends WidgetKind>(kind: TKind): Promise<WidgetDefinitionFor<TKind>>;
  loadAllWidgetDefinitions(): Promise<Map<WidgetKind, CanonicalDefinitions[WidgetKind]>>;
  dispose(): void;
}

export const widgetKinds = [...declaredWidgetKinds];

const storeDefinitionPromise = <TDefinitions extends object, TKind extends keyof TDefinitions>(
  cache: { [K in keyof TDefinitions]?: Promise<TDefinitions[K]> },
  kind: TKind,
  promise: Promise<TDefinitions[TKind]>,
): void => {
  cache[kind] = promise;
};

export const createWidgetDefinitionManifest = ({
  resources,
  assertCurrent,
}: {
  resources: DefinitionResourceBindings;
  assertCurrent: () => void;
}): WidgetDefinitionManifest => {
  assertCurrent();

  const captureBinding = <TResources extends object>(
    binding: DefinitionResourceBinding<TResources>,
  ): DefinitionResourceBinding<TResources> => {
    if (binding.status === "held") return { ...binding };
    return { status: "ready", resources: { ...binding.resources } };
  };

  const kinds = [...declaredWidgetKinds];
  const bindings: DefinitionResourceBindings = {
    bookmarks: captureBinding(resources.bookmarks),
    healthMonitoring: captureBinding(resources.healthMonitoring),
    dockerContainers: captureBinding(resources.dockerContainers),
    systemDisks: captureBinding(resources.systemDisks),
    timetable: captureBinding(resources.timetable),
    "immich-albumCarousel": captureBinding(resources["immich-albumCarousel"]),
    beszelSystemStats: captureBinding(resources.beszelSystemStats),
  };
  const definitionPromises: { [TKind in WidgetKind]?: Promise<CanonicalDefinitions[TKind]> } = {};
  let allDefinitionsPromise: Promise<Map<WidgetKind, CanonicalDefinitions[WidgetKind]>> | undefined;
  let disposed = false;

  const assertUsable = () => {
    if (disposed) throw new Error("Widget definition manifest is disposed");
    assertCurrent();
  };

  const bindDefinition = <TResources, TDefinition>(
    kind: ResourceWidgetKind,
    binding: DefinitionResourceBinding<TResources>,
    createDefinition: (resources: TResources) => TDefinition,
  ): TDefinition => {
    assertUsable();
    if (binding.status === "held") throw new Error(`Widget definition ${kind} is held: ${binding.reason}`);
    const definition = createDefinition(binding.resources);
    assertUsable();
    return definition;
  };

  const loaders: { [TKind in WidgetKind]: () => Promise<CanonicalDefinitions[TKind]> } = {
    clock: () => widgetDefinitionModuleLoaders.clock().then(({ definition }) => definition),
    airQuality: () => widgetDefinitionModuleLoaders.airQuality().then(({ definition }) => definition),
    countdown: () => widgetDefinitionModuleLoaders.countdown().then(({ definition }) => definition),
    timer: () => widgetDefinitionModuleLoaders.timer().then(({ definition }) => definition),
    app: () => widgetDefinitionModuleLoaders.app().then(({ definition }) => definition),
    assistant: () => widgetDefinitionModuleLoaders.assistant().then(({ definition }) => definition),
    archiveTeamWarrior: () => widgetDefinitionModuleLoaders.archiveTeamWarrior().then(({ definition }) => definition),
    anchorNote: () => widgetDefinitionModuleLoaders.anchorNote().then(({ definition }) => definition),
    notebook: () => widgetDefinitionModuleLoaders.notebook().then(({ definition }) => definition),
    iframe: () => widgetDefinitionModuleLoaders.iframe().then(({ definition }) => definition),
    video: () => widgetDefinitionModuleLoaders.video().then(({ definition }) => definition),
    dnsHoleSummary: () => widgetDefinitionModuleLoaders.dnsHoleSummary().then(({ definition }) => definition),
    dnsHoleControls: () => widgetDefinitionModuleLoaders.dnsHoleControls().then(({ definition }) => definition),
    "smartHome-entityState": () =>
      widgetDefinitionModuleLoaders["smartHome-entityState"]().then(({ definition }) => definition),
    "smartHome-executeAutomation": () =>
      widgetDefinitionModuleLoaders["smartHome-executeAutomation"]().then(({ definition }) => definition),
    stockPrice: () => widgetDefinitionModuleLoaders.stockPrice().then(({ definition }) => definition),
    mediaServer: () => widgetDefinitionModuleLoaders.mediaServer().then(({ definition }) => definition),
    calendar: () => widgetDefinitionModuleLoaders.calendar().then(({ definition }) => definition),
    downloads: () => widgetDefinitionModuleLoaders.downloads().then(({ definition }) => definition),
    "mediaRequests-requestList": () =>
      widgetDefinitionModuleLoaders["mediaRequests-requestList"]().then(({ definition }) => definition),
    "mediaRequests-requestStats": () =>
      widgetDefinitionModuleLoaders["mediaRequests-requestStats"]().then(({ definition }) => definition),
    mediaMissing: () => widgetDefinitionModuleLoaders.mediaMissing().then(({ definition }) => definition),
    networkControllerSummary: () =>
      widgetDefinitionModuleLoaders.networkControllerSummary().then(({ definition }) => definition),
    networkControllerStatus: () =>
      widgetDefinitionModuleLoaders.networkControllerStatus().then(({ definition }) => definition),
    rssFeed: () => widgetDefinitionModuleLoaders.rssFeed().then(({ definition }) => definition),
    bookmarks: () =>
      widgetDefinitionModuleLoaders
        .bookmarks()
        .then(({ createDefinition }) => bindDefinition("bookmarks", bindings.bookmarks, createDefinition)),
    bazarr: () => widgetDefinitionModuleLoaders.bazarr().then(({ definition }) => definition),
    indexerManager: () => widgetDefinitionModuleLoaders.indexerManager().then(({ definition }) => definition),
    healthMonitoring: () =>
      widgetDefinitionModuleLoaders
        .healthMonitoring()
        .then(({ createDefinition }) =>
          bindDefinition("healthMonitoring", bindings.healthMonitoring, createDefinition),
        ),
    mediaTranscoding: () => widgetDefinitionModuleLoaders.mediaTranscoding().then(({ definition }) => definition),
    minecraftServerStatus: () =>
      widgetDefinitionModuleLoaders.minecraftServerStatus().then(({ definition }) => definition),
    dockerContainers: () =>
      widgetDefinitionModuleLoaders
        .dockerContainers()
        .then(({ createDefinition }) =>
          bindDefinition("dockerContainers", bindings.dockerContainers, createDefinition),
        ),
    releases: () => widgetDefinitionModuleLoaders.releases().then(({ definition }) => definition),
    firewall: () => widgetDefinitionModuleLoaders.firewall().then(({ definition }) => definition),
    notifications: () => widgetDefinitionModuleLoaders.notifications().then(({ definition }) => definition),
    mediaReleases: () => widgetDefinitionModuleLoaders.mediaReleases().then(({ definition }) => definition),
    systemResources: () => widgetDefinitionModuleLoaders.systemResources().then(({ definition }) => definition),
    coolify: () => widgetDefinitionModuleLoaders.coolify().then(({ definition }) => definition),
    systemDisks: () =>
      widgetDefinitionModuleLoaders
        .systemDisks()
        .then(({ createDefinition }) => bindDefinition("systemDisks", bindings.systemDisks, createDefinition)),
    timetable: () =>
      widgetDefinitionModuleLoaders
        .timetable()
        .then(({ createDefinition }) => bindDefinition("timetable", bindings.timetable, createDefinition)),
    "immich-serverStats": () =>
      widgetDefinitionModuleLoaders["immich-serverStats"]().then(({ definition }) => definition),
    "immich-albumCarousel": () =>
      widgetDefinitionModuleLoaders["immich-albumCarousel"]().then(({ createDefinition }) =>
        bindDefinition("immich-albumCarousel", bindings["immich-albumCarousel"], createDefinition),
      ),
    stats: () => widgetDefinitionModuleLoaders.stats().then(({ definition }) => definition),
    paperlessNgx: () => widgetDefinitionModuleLoaders.paperlessNgx().then(({ definition }) => definition),
    patchmon: () => widgetDefinitionModuleLoaders.patchmon().then(({ definition }) => definition),
    tracearr: () => widgetDefinitionModuleLoaders.tracearr().then(({ definition }) => definition),
    speedtestTracker: () => widgetDefinitionModuleLoaders.speedtestTracker().then(({ definition }) => definition),
    uptimeKuma: () => widgetDefinitionModuleLoaders.uptimeKuma().then(({ definition }) => definition),
    audioStats: () => widgetDefinitionModuleLoaders.audioStats().then(({ definition }) => definition),
    umami: () => widgetDefinitionModuleLoaders.umami().then(({ definition }) => definition),
    vpn: () => widgetDefinitionModuleLoaders.vpn().then(({ definition }) => definition),
    ups: () => widgetDefinitionModuleLoaders.ups().then(({ definition }) => definition),
    beszelSystemTable: () => widgetDefinitionModuleLoaders.beszelSystemTable().then(({ definition }) => definition),
    beszelSystemGrid: () => widgetDefinitionModuleLoaders.beszelSystemGrid().then(({ definition }) => definition),
    beszelAlerts: () => widgetDefinitionModuleLoaders.beszelAlerts().then(({ definition }) => definition),
    beszelSystemStats: () =>
      widgetDefinitionModuleLoaders
        .beszelSystemStats()
        .then(({ createDefinition }) =>
          bindDefinition("beszelSystemStats", bindings.beszelSystemStats, createDefinition),
        ),
    traefik: () => widgetDefinitionModuleLoaders.traefik().then(({ definition }) => definition),
    customApi: () => widgetDefinitionModuleLoaders.customApi().then(({ definition }) => definition),
    weather: () => widgetDefinitionModuleLoaders.weather().then(({ definition }) => definition),
    wud: () => widgetDefinitionModuleLoaders.wud().then(({ definition }) => definition),
    llamacpp: () => widgetDefinitionModuleLoaders.llamacpp().then(({ definition }) => definition),
    wazuhAgents: () => widgetDefinitionModuleLoaders.wazuhAgents().then(({ definition }) => definition),
    wazuhAlerts: () => widgetDefinitionModuleLoaders.wazuhAlerts().then(({ definition }) => definition),
    wazuhSummary: () => widgetDefinitionModuleLoaders.wazuhSummary().then(({ definition }) => definition),
    wazuhTimeline: () => widgetDefinitionModuleLoaders.wazuhTimeline().then(({ definition }) => definition),
    wazuhTopList: () => widgetDefinitionModuleLoaders.wazuhTopList().then(({ definition }) => definition),
    wazuhVulnerabilities: () =>
      widgetDefinitionModuleLoaders.wazuhVulnerabilities().then(({ definition }) => definition),
    wazuhFim: () => widgetDefinitionModuleLoaders.wazuhFim().then(({ definition }) => definition),
    wazuhAuthFailures: () => widgetDefinitionModuleLoaders.wazuhAuthFailures().then(({ definition }) => definition),
  };

  const loadWidgetDefinition = <TKind extends WidgetKind>(kind: TKind): Promise<WidgetDefinitionFor<TKind>> => {
    assertUsable();
    const existing = definitionPromises[kind];
    if (existing) return existing;

    const loader: () => Promise<CanonicalDefinitions[TKind]> = loaders[kind];
    const promise: Promise<CanonicalDefinitions[TKind]> = Promise.resolve()
      .then<CanonicalDefinitions[TKind]>(() => {
        assertUsable();
        return loader();
      })
      .then((definition) => {
        assertUsable();
        return definition;
      });
    storeDefinitionPromise<CanonicalDefinitions, TKind>(definitionPromises, kind, promise);
    void promise.catch(() => {
      if (definitionPromises[kind] === promise) delete definitionPromises[kind];
    });
    return promise;
  };

  const loadAllWidgetDefinitions = (): Promise<Map<WidgetKind, CanonicalDefinitions[WidgetKind]>> => {
    assertUsable();
    if (allDefinitionsPromise) return allDefinitionsPromise;

    const promise = Promise.all(
      kinds.map((kind) =>
        loadWidgetDefinition(kind).then(
          (definition) => [kind, definition] satisfies [WidgetKind, CanonicalDefinitions[WidgetKind]],
        ),
      ),
    ).then((entries) => {
      assertUsable();
      return new Map(entries);
    });
    allDefinitionsPromise = promise;
    void promise.catch(() => {
      if (allDefinitionsPromise === promise) allDefinitionsPromise = undefined;
    });
    return promise;
  };

  return {
    loadWidgetDefinition,
    loadAllWidgetDefinitions,
    dispose() {
      disposed = true;
      for (const kind of kinds) delete definitionPromises[kind];
      allDefinitionsPromise = undefined;
    },
  };
};

export const reduceWidgetOptionsWithDefinition = (
  definition: WidgetDefinition,
  settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">,
  currentValue: Record<string, unknown> = {},
) => {
  const options: Record<string, WidgetOptionDefinition> = definition.createOptions(settings);
  const result: Record<string, unknown> = {};
  for (const [key, option] of objectEntries(options)) {
    result[key] = currentValue[key] ?? option.defaultValue;
  }
  return result;
};
