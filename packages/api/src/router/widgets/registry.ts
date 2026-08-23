import type { AnyTRPCRouter } from "@trpc/server";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import type { WidgetKind } from "@homarr/definitions";

import { generatedWidgetRouterRegistry } from "./generated-registry";

const {
  weather: generatedWeatherRouter,
  downloads: generatedDownloadsRouter,
  ...additionalGeneratedWidgetRouters
} = generatedWidgetRouterRegistry;

const logger = createLogger({ module: "widgetRouterRegistry" });

type McpRouterNamespace = false | true | string;

type WidgetRouterRegistration<TRouter extends AnyTRPCRouter, TMcpNamespace extends McpRouterNamespace> = {
  widgetKinds: readonly [WidgetKind, ...WidgetKind[]];
  loadRouter: () => Promise<TRouter>;
  mcp: TMcpNamespace;
};

const registerWidgetRouter = <TRouter extends AnyTRPCRouter, const TMcpNamespace extends McpRouterNamespace = false>(
  widgetKinds: readonly [WidgetKind, ...WidgetKind[]],
  loadRouter: () => Promise<TRouter>,
  options?: { mcp?: TMcpNamespace },
): WidgetRouterRegistration<TRouter, TMcpNamespace> => ({
  widgetKinds,
  loadRouter,
  mcp: (options?.mcp ?? false) as TMcpNamespace,
});

/**
 * Shared namespace-to-feature contract for widget tRPC consumers.
 *
 * Keep import paths explicit so Next.js can split every implementation while
 * consumers share one widget-to-router association.
 */
export const widgetRouterRegistry = {
  archiveTeamWarrior: registerWidgetRouter(["archiveTeamWarrior"], () =>
    import("./archive-team-warrior").then((module) => module.archiveTeamWarriorRouter),
  ),
  beszel: registerWidgetRouter(
    ["beszelSystemTable", "beszelSystemGrid", "beszelAlerts", "beszelSystemStats"],
    () => import("./beszel").then((module) => module.beszelRouter),
    { mcp: true },
  ),
  anchorNotes: registerWidgetRouter(["anchorNote"], () =>
    import("./anchor-notes").then((module) => module.anchorNotesRouter),
  ),
  coolify: registerWidgetRouter(["coolify"], () => import("./coolify").then((module) => module.coolifyRouter)),
  immich: registerWidgetRouter(["immich-serverStats", "immich-albumCarousel"], () =>
    import("./immich").then((module) => module.immichRouter),
  ),
  paperlessNgx: registerWidgetRouter(["paperlessNgx"], () =>
    import("./paperless-ngx").then((module) => module.paperlessNgxRouter),
  ),
  patchmon: registerWidgetRouter(["patchmon"], () => import("./patchmon").then((module) => module.patchmonRouter), {
    mcp: true,
  }),
  bazarr: registerWidgetRouter(["bazarr"], () => import("./bazarr").then((module) => module.bazarrRouter), {
    mcp: true,
  }),
  notebook: registerWidgetRouter(["notebook"], () => import("./notebook").then((module) => module.notebookRouter)),
  weather: generatedWeatherRouter,
  airQuality: registerWidgetRouter(
    ["airQuality"],
    () => import("./air-quality").then((module) => module.airQualityRouter),
    { mcp: true },
  ),
  app: registerWidgetRouter(["app"], () => import("./app").then((module) => module.appRouter)),
  dnsHole: registerWidgetRouter(
    ["dnsHoleSummary", "dnsHoleControls"],
    () => import("./dns-hole").then((module) => module.dnsHoleRouter),
    { mcp: true },
  ),
  smartHome: registerWidgetRouter(
    ["smartHome-entityState", "smartHome-executeAutomation"],
    () => import("./smart-home").then((module) => module.smartHomeRouter),
    { mcp: true },
  ),
  stockPrice: registerWidgetRouter(["stockPrice"], () => import("./stocks").then((module) => module.stockPriceRouter)),
  mediaServer: registerWidgetRouter(
    ["mediaServer", "audioStats"],
    () => import("./media-server").then((module) => module.mediaServerRouter),
    { mcp: true },
  ),
  mediaRelease: registerWidgetRouter(["mediaReleases"], () =>
    import("./media-release").then((module) => module.mediaReleaseRouter),
  ),
  calendar: registerWidgetRouter(["calendar"], () => import("./calendar").then((module) => module.calendarRouter), {
    mcp: true,
  }),
  downloads: generatedDownloadsRouter,
  mediaRequests: registerWidgetRouter(
    ["mediaRequests-requestList", "mediaRequests-requestStats"],
    () => import("./media-requests").then((module) => module.mediaRequestsRouter),
    { mcp: true },
  ),
  mediaOrganizer: registerWidgetRouter(["mediaMissing"], () =>
    import("./media-organizer").then((module) => module.mediaOrganizerRouter),
  ),
  rssFeed: registerWidgetRouter(["rssFeed"], () => import("./rssFeed").then((module) => module.rssFeedRouter)),
  indexerManager: registerWidgetRouter(["indexerManager"], () =>
    import("./indexer-manager").then((module) => module.indexerManagerRouter),
  ),
  healthMonitoring: registerWidgetRouter(
    ["healthMonitoring", "systemResources", "systemDisks"],
    () => import("./health-monitoring").then((module) => module.healthMonitoringRouter),
    { mcp: true },
  ),
  mediaTranscoding: registerWidgetRouter(["mediaTranscoding"], () =>
    import("./media-transcoding").then((module) => module.mediaTranscodingRouter),
  ),
  minecraft: registerWidgetRouter(["minecraftServerStatus"], () =>
    import("./minecraft").then((module) => module.minecraftRouter),
  ),
  releases: registerWidgetRouter(["releases"], () => import("./releases").then((module) => module.releasesRouter)),
  networkController: registerWidgetRouter(["networkControllerSummary", "networkControllerStatus"], () =>
    import("./network-controller").then((module) => module.networkControllerRouter),
  ),
  firewall: registerWidgetRouter(["firewall"], () => import("./firewall").then((module) => module.firewallRouter)),
  notifications: registerWidgetRouter(["notifications"], () =>
    import("./notifications").then((module) => module.notificationsRouter),
  ),
  timetable: registerWidgetRouter(["timetable"], () => import("./timetable").then((module) => module.timetableRouter)),
  tracearr: registerWidgetRouter(["tracearr"], () => import("./tracearr").then((module) => module.tracearrRouter)),
  speedtestTracker: registerWidgetRouter(["speedtestTracker"], () =>
    import("./speedtest-tracker").then((module) => module.speedtestTrackerRouter),
  ),
  uptimeKuma: registerWidgetRouter(["uptimeKuma"], () =>
    import("./uptime-kuma").then((module) => module.uptimeKumaRouter),
  ),
  audioStats: registerWidgetRouter(["audioStats"], () =>
    import("./audio-stats").then((module) => module.audioStatsRouter),
  ),
  umami: registerWidgetRouter(["umami"], () => import("./umami").then((module) => module.umamiRouter)),
  vpn: registerWidgetRouter(["vpn"], () => import("./vpn").then((module) => module.vpnRouter)),
  ups: registerWidgetRouter(["ups"], () => import("./ups").then((module) => module.upsRouter)),
  traefik: registerWidgetRouter(["traefik"], () => import("./traefik").then((module) => module.traefikRouter)),
  customApi: registerWidgetRouter(["customApi"], () => import("./custom-api").then((module) => module.customApiRouter)),
  secrets: registerWidgetRouter(
    ["releases"],
    () => import("./widget-secrets").then((module) => module.widgetSecretsRouter),
    { mcp: "widgetSecrets" },
  ),
  wud: registerWidgetRouter(["wud"], () => import("./wud").then((module) => module.wudRouter)),
  ...additionalGeneratedWidgetRouters,
};

export type WidgetRouterName = keyof typeof widgetRouterRegistry;
type LoadedWidgetRouterRecord = {
  [TName in WidgetRouterName]: Awaited<ReturnType<(typeof widgetRouterRegistry)[TName]["loadRouter"]>>;
};

interface McpWidgetRouterSelection {
  name: WidgetRouterName;
  namespace: string;
}

export const mcpWidgetRouterSelections: readonly McpWidgetRouterSelection[] = Object.entries(
  widgetRouterRegistry,
).flatMap(([name, registration]) => {
  if (!registration.mcp) return [];

  let namespace = name;
  if (typeof registration.mcp === "string") namespace = registration.mcp;
  return [{ name: name as WidgetRouterName, namespace }];
});

export const mcpWidgetRouterNames: readonly WidgetRouterName[] = mcpWidgetRouterSelections.map(
  (selection) => selection.name,
);

export async function loadWidgetRoutersAsync<const TNames extends readonly WidgetRouterName[]>(
  names: TNames,
  consumer: string,
): Promise<Pick<LoadedWidgetRouterRecord, TNames[number]>> {
  const loadedRouters: Partial<Record<WidgetRouterName, AnyTRPCRouter>> = {};

  await Promise.all(
    names.map(async (name) => {
      const registration = widgetRouterRegistry[name];
      const startedAt = Date.now();
      try {
        loadedRouters[name] = await registration.loadRouter();
        logger.debug("Loaded widget router", {
          consumer,
          routerName: name,
          widgetKinds: registration.widgetKinds,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        logger.error(
          new ErrorWithMetadata(
            "Failed to load widget router",
            {
              consumer,
              routerName: name,
              widgetKinds: registration.widgetKinds,
              durationMs: Date.now() - startedAt,
            },
            { cause: error },
          ),
        );
        throw error;
      }
    }),
  );

  return loadedRouters as Pick<LoadedWidgetRouterRecord, TNames[number]>;
}

export async function loadMcpWidgetRoutersAsync(): Promise<Record<string, AnyTRPCRouter>> {
  const loadedRouters = await loadWidgetRoutersAsync(mcpWidgetRouterNames, "mcp");
  const mcpRouters: Record<string, AnyTRPCRouter> = {};

  for (const selection of mcpWidgetRouterSelections) {
    mcpRouters[selection.namespace] = loadedRouters[selection.name];
  }

  return mcpRouters;
}
