import { setImmediate } from "node:timers/promises";

import { hashKey } from "@tanstack/react-query";
import type { FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/react-query";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { api, trpc } from "@homarr/api/server";
import type { WidgetKind } from "@homarr/definitions";
import { beszelTimePeriodSchema, defaultBeszelTimePeriod } from "@homarr/definitions/beszel";
import { radarrReleaseTypes } from "@homarr/integrations/types";
import type { SettingsContextProps } from "@homarr/settings/creator";

import { getBeszelAlertsQueryInput } from "./beszel-alerts/display";
import {
  createBeszelSystemChoices,
  resolveBeszelSystemChoice,
  resolveStoredBeszelQuerySelection,
} from "./beszel-system-stats/selection";
import type { WidgetComponentProps } from "./definition";
import { resolveDownloadsQueryInput } from "./downloads/query-input";
import { ALL_PHOTOS_ALBUM_ID } from "./immich/album-carousel/constants";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "./manifest";
import {
  getReleasesLatestInputs,
  getReleasesLinkedIntegrationIds,
  normalizeReleasesRepositories,
} from "./releases/query-input";
import { statsEntriesSchema } from "./stats/config";

class CaptureDeadlineError extends Error {
  constructor() {
    super("Board capture deadline exceeded");
  }
}

const prefetchQuery = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  deadline?: number,
) => {
  if (deadline !== undefined && Date.now() >= deadline) return;
  const queryFn = options.queryFn;
  if (typeof queryFn !== "function") return;
  // Register every pending promise now, and let React flush the shell before
  // query middleware and integration initialization consume the server thread.
  return queryClient.prefetchQuery({
    ...options,
    meta: { ...options.meta, rscWidgetPrefetch: true },
    // A restored board snapshot supplies the first paint while this request
    // refreshes the value on the server for the current navigation.
    staleTime: 0,
    queryFn: async (context) => {
      await setImmediate();
      if (deadline !== undefined && Date.now() >= deadline) throw new CaptureDeadlineError();
      await setImmediate();
      if (deadline !== undefined && Date.now() >= deadline) throw new CaptureDeadlineError();
      return await queryFn(context);
    },
  });
};

type Board = RouterOutputs["board"]["getHomeBoard"];
type Item = Board["items"][number];
type BeszelStatsInput = RouterInputs["widget"]["beszel"]["getSystemStats"];
const mediaRequestStatuses = ["pending", "approved", "declined", "failed", "completed"] as const;

const isInitiallyVisible = (board: Board, item: Item, layoutId: string) => {
  const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
  if (!layout) return false;
  let sectionId: string | undefined = layout.sectionId;
  const visited = new Set<string>();
  while (sectionId && !visited.has(sectionId)) {
    visited.add(sectionId);
    const section = board.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return false;
    if (section.kind !== "empty" && section.collapsed) return false;
    if (section.kind !== "container") break;
    sectionId = section.layouts.find((candidate) => candidate.layoutId === layoutId)?.parentSectionId;
  }
  return true;
};

export const getInitiallyVisibleWidgetKinds = (board: Board, layoutId: string) => [
  ...new Set(board.items.filter((item) => isInitiallyVisible(board, item, layoutId)).map((item) => item.kind)),
];

const prefetchBeszelStats = (queryClient: QueryClient, item: Item, deadline?: number) => {
  if (deadline !== undefined && Date.now() >= deadline) return;
  const { integrationIds, options } = item;
  const storedValue = String(options.systemId ?? "");
  const selection = resolveStoredBeszelQuerySelection(storedValue, integrationIds);
  const period = beszelTimePeriodSchema.safeParse(options.timePeriod ?? defaultBeszelTimePeriod);
  if (!period.success || period.data === "1m") return;
  const timePeriod = period.data;
  const includeDocker = ["showDockerCpu", "showDockerMemory", "showDockerNetwork"].some(
    (key) => (options[key] ?? true) === true,
  );
  if (!selection) {
    // An unset system or an ambiguous legacy ID needs discovery first. Stream
    // its exact stats query from a separate boundary as soon as discovery ends.
    return queryClient.fetchQuery(trpc.widget.beszel.getSystems.queryOptions({ integrationIds })).then(
      (systems) => {
        const selected = resolveBeszelSystemChoice(createBeszelSystemChoices(systems), storedValue);
        if (!selected) return;
        prefetchQuery(
          queryClient,
          {
            ...trpc.widget.beszel.getSystemStats.queryOptions({
              integrationIds: [selected.integrationId],
              systemId: selected.systemId,
              timePeriod,
              includeDocker,
            }),
            meta: { streamedBeszelSelection: true },
          },
          deadline,
        );
      },
      () => undefined,
    );
  }
  const input: BeszelStatsInput = {
    ...selection,
    timePeriod,
    includeDocker,
  };
  const query = trpc.widget.beszel.getSystemStats.queryOptions(input);
  // Register the dependent promise before dehydration. Resolve the selection on
  // the server rather than waiting for a client discovery/render round trip.
  prefetchQuery(
    queryClient,
    {
      ...query,
      queryFn: async () => {
        const systems = await queryClient.fetchQuery(trpc.widget.beszel.getSystems.queryOptions({ integrationIds }));
        const selected = resolveBeszelSystemChoice(createBeszelSystemChoices(systems), storedValue);
        if (!selected || selected.systemId !== input.systemId || selected.integrationId !== input.integrationIds[0]) {
          throw new Error("The selected Beszel system is no longer available");
        }
        if (deadline !== undefined && Date.now() >= deadline) throw new CaptureDeadlineError();
        return await api.widget.beszel.getSystemStats(input);
      },
    },
    deadline,
  );
};

// A browser's local month can differ from the server around a month boundary.
// Only prefetch when every supported timezone resolves to the same month.
const getUnambiguousCalendarMonth = () => {
  const now = Date.now();
  const earliest = new Date(now - 14 * 60 * 60 * 1000);
  const latest = new Date(now + 14 * 60 * 60 * 1000);
  if (earliest.getUTCMonth() !== latest.getUTCMonth() || earliest.getUTCFullYear() !== latest.getUTCFullYear())
    return null;
  return { month: earliest.getUTCMonth() + 1, year: earliest.getUTCFullYear() };
};

export const prefetchInitialWidgetData = (
  queryClient: QueryClient,
  board: Board,
  layoutId: string,
  isAuthenticated: boolean,
  deadline?: number,
) => {
  const dependentQueries: Promise<void>[] = [];
  const calendarMonth = getUnambiguousCalendarMonth();
  if (isAuthenticated) prefetchQuery(queryClient, trpc.integration.all.queryOptions());
  for (const item of board.items) {
    if (!isInitiallyVisible(board, item, layoutId)) continue;
    const { integrationIds, options } = item;
    // These are the consumers' exact inputs, including order and defaults. Calls
    // go through the API middleware and share its request-scoped auth/context.
    switch (item.kind) {
      case "dnsHoleSummary":
      case "dnsHoleControls":
        if (integrationIds.length)
          prefetchQuery(queryClient, trpc.widget.dnsHole.summary.queryOptions({ integrationIds }));
        break;
      case "beszelSystemStats":
      case "beszelSystemTable":
      case "beszelSystemGrid":
        if (!integrationIds.length) break;
        prefetchQuery(queryClient, trpc.widget.beszel.getSystems.queryOptions({ integrationIds }));
        if (item.kind === "beszelSystemStats") {
          const discovery = prefetchBeszelStats(queryClient, item, deadline);
          if (discovery) dependentQueries.push(discovery);
        }
        break;
      case "downloads":
        if (integrationIds.length)
          prefetchQuery(
            queryClient,
            trpc.widget.downloads.getJobsAndStatuses.queryOptions(resolveDownloadsQueryInput(integrationIds, options)),
          );
        break;
      case "indexerManager":
        if (integrationIds.length)
          prefetchQuery(queryClient, trpc.widget.indexerManager.getIndexersStatus.queryOptions({ integrationIds }));
        break;
      case "mediaReleases":
        if (integrationIds.length)
          prefetchQuery(queryClient, trpc.widget.mediaRelease.getMediaReleases.queryOptions({ integrationIds }));
        break;
      case "mediaServer":
        if (integrationIds.length)
          prefetchQuery(
            queryClient,
            trpc.widget.mediaServer.getCurrentStreams.queryOptions({
              integrationIds,
              showOnlyPlaying: (options.showOnlyPlaying ?? true) === true,
            }),
          );
        break;
      case "mediaRequests-requestList": {
        if (!integrationIds.length) break;
        let statuses: RouterInputs["widget"]["mediaRequests"]["getLatestRequests"]["statuses"] = [
          ...mediaRequestStatuses,
        ];
        if (Array.isArray(options.statusFilter) && options.statusFilter.length > 0) {
          statuses = options.statusFilter.filter((value): value is (typeof mediaRequestStatuses)[number] =>
            mediaRequestStatuses.some((status) => status === value),
          );
          if (statuses.length !== options.statusFilter.length) break;
        }
        prefetchQuery(
          queryClient,
          trpc.widget.mediaRequests.getLatestRequests.queryOptions({
            integrationIds,
            statuses,
            recentDays: Number(options.recentDays ?? 0),
          }),
        );
        break;
      }
      case "immich-serverStats":
        if (integrationIds[0])
          prefetchQuery(
            queryClient,
            trpc.widget.immich.getServerStats.queryOptions({ integrationId: integrationIds[0] }),
          );
        break;
      case "immich-albumCarousel": {
        if (!integrationIds[0]) break;
        let albumId: string | undefined;
        if (typeof options.albumId === "string" && options.albumId && options.albumId !== ALL_PHOTOS_ALBUM_ID)
          albumId = options.albumId;
        if (albumId)
          prefetchQuery(
            queryClient,
            trpc.widget.immich.getAlbumPreview.queryOptions({
              integrationId: integrationIds[0],
              albumId,
              randomizePhotos: options.randomizePhotos === true,
            }),
          );
        prefetchQuery(
          queryClient,
          trpc.widget.immich.getAlbum.queryOptions({ integrationId: integrationIds[0], albumId }),
        );
        break;
      }
      case "dockerContainers": {
        let input: RouterInputs["docker"]["getContainers"];
        if (
          Array.isArray(options.endpointIds) &&
          options.endpointIds.length > 0 &&
          options.endpointIds.every((id) => typeof id === "string")
        )
          input = { endpointIds: options.endpointIds };
        prefetchQuery(queryClient, trpc.docker.getContainers.queryOptions(input));
        break;
      }
      case "rssFeed":
        if (Array.isArray(options.feedUrls) && options.feedUrls.every((url) => typeof url === "string"))
          prefetchQuery(
            queryClient,
            trpc.widget.rssFeed.getFeeds.queryOptions({
              urls: options.feedUrls,
              maximumAmountPosts: Number(options.maximumAmountPosts ?? 100),
              descriptionMaxLength: Number(options.descriptionMaxLength ?? 250),
            }),
          );
        break;
      case "weather": {
        const location = options.location;
        if (
          location &&
          typeof location === "object" &&
          "latitude" in location &&
          "longitude" in location &&
          typeof location.latitude === "number" &&
          typeof location.longitude === "number"
        ) {
          prefetchQuery(
            queryClient,
            trpc.widget.weather.atLocation.queryOptions({ latitude: location.latitude, longitude: location.longitude }),
          );
        }
        break;
      }
      case "calendar": {
        if (!integrationIds.length || !calendarMonth) break;
        let releaseType: RouterInputs["widget"]["calendar"]["findAllEvents"]["releaseType"] = [
          "inCinemas",
          "digitalRelease",
        ];
        if (Array.isArray(options.releaseType)) {
          releaseType = options.releaseType.filter((value): value is (typeof radarrReleaseTypes)[number] =>
            radarrReleaseTypes.some((type) => type === value),
          );
          if (releaseType.length !== options.releaseType.length) break;
        }
        prefetchQuery(
          queryClient,
          trpc.widget.calendar.findAllEvents.queryOptions({
            integrationIds,
            ...calendarMonth,
            releaseType,
            showUnmonitored: (options.showUnmonitored ?? false) === true,
          }),
        );
        break;
      }
    }
  }
  return dependentQueries;
};

const capturePrefetchKinds = new Set<WidgetKind>([
  "airQuality",
  "anchorNote",
  "audioStats",
  "bazarr",
  "beszelAlerts",
  "coolify",
  "firewall",
  "healthMonitoring",
  "mediaMissing",
  "mediaRequests-requestStats",
  "networkControllerStatus",
  "notifications",
  "paperlessNgx",
  "patchmon",
  "releases",
  "speedtestTracker",
  "stats",
  "stockPrice",
  "systemDisks",
  "systemResources",
  "timetable",
  "tracearr",
  "traefik",
  "umami",
  "ups",
  "uptimeKuma",
  "vpn",
]);

const maxCapturePrefetches = 128;
const capturePrefetchConcurrency = 8;

export interface CapturePrefetchOutcome {
  eligibleItems: number;
  registered: number;
  capped: number;
  timedOut: number;
  failed: number;
  preparationFailed: number;
}

export const prefetchCapturedWidgetData = async (
  queryClient: QueryClient,
  board: Board,
  layoutId: string,
  {
    isAuthenticated,
    settings,
    deadline,
    outcome,
    maxRegistrations = maxCapturePrefetches,
    concurrency = capturePrefetchConcurrency,
  }: {
    isAuthenticated: boolean;
    settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">;
    deadline: number;
    outcome: CapturePrefetchOutcome;
    maxRegistrations?: number;
    concurrency?: number;
  },
) => {
  const registeredIdentities = new Set<string>();
  const admittedKeys: QueryKey[] = [];
  const pending: Array<() => Promise<void> | undefined> = [];
  const register = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
    queryOptions: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  ) => {
    if (Date.now() >= deadline) {
      outcome.timedOut++;
      return;
    }
    const queryKey = queryOptions.queryKey;
    if (!queryKey) return;
    const identity = hashKey(queryKey);
    if (registeredIdentities.has(identity)) return;
    if (registeredIdentities.size >= maxRegistrations) {
      outcome.capped++;
      return;
    }
    registeredIdentities.add(identity);
    admittedKeys.push(queryKey);
    outcome.registered++;
    pending.push(() => prefetchQuery(queryClient, queryOptions, deadline));
  };

  const registerItem = async (item: Item) => {
    const { integrationIds } = item;
    const firstIntegrationId = integrationIds[0];
    const definition = await loadWidgetDefinition(item.kind);
    const options = reduceWidgetOptionsWithDefinition(definition, settings, item.options);
    switch (item.kind) {
      case "airQuality": {
        const location = options.location;
        if (
          location &&
          typeof location === "object" &&
          "latitude" in location &&
          "longitude" in location &&
          typeof location.latitude === "number" &&
          typeof location.longitude === "number"
        )
          register(
            trpc.widget.airQuality.atLocation.queryOptions({
              latitude: location.latitude,
              longitude: location.longitude,
            }),
          );
        break;
      }
      case "anchorNote": {
        const { noteId } = options as WidgetComponentProps<"anchorNote">["options"];
        if (firstIntegrationId && typeof noteId === "string" && noteId.trim())
          register(
            trpc.widget.anchorNotes.getNote.queryOptions({ integrationId: firstIntegrationId, noteId: noteId.trim() }),
          );
        break;
      }
      case "audioStats":
        if (firstIntegrationId)
          register(trpc.widget.audioStats.getStats.queryOptions({ integrationId: firstIntegrationId }));
        break;
      case "bazarr":
        if (firstIntegrationId)
          register(trpc.widget.bazarr.getBadges.queryOptions({ integrationId: firstIntegrationId }));
        break;
      case "beszelAlerts": {
        if (!integrationIds.length) break;
        const { showHistory, maxHistoryItems } = options as WidgetComponentProps<"beszelAlerts">["options"];
        register(
          trpc.widget.beszel.getAlerts.queryOptions(
            getBeszelAlertsQueryInput(integrationIds, { showHistory, maxHistoryItems }, false),
          ),
        );
        break;
      }
      case "coolify":
        if (integrationIds.length) register(trpc.widget.coolify.getInstancesInfo.queryOptions({ integrationIds }));
        break;
      case "firewall":
        if (integrationIds.length) {
          register(trpc.widget.firewall.getFirewallCpuStatus.queryOptions({ integrationIds }));
          register(trpc.widget.firewall.getFirewallMemoryStatus.queryOptions({ integrationIds }));
          register(trpc.widget.firewall.getFirewallVersionStatus.queryOptions({ integrationIds }));
          register(trpc.widget.firewall.getFirewallInterfacesStatus.queryOptions({ integrationIds }));
        }
        break;
      case "healthMonitoring":
      case "systemResources":
      case "systemDisks":
        if (integrationIds.length)
          register(trpc.widget.healthMonitoring.getSystemHealthStatus.queryOptions({ integrationIds }));
        break;
      case "mediaMissing": {
        if (!integrationIds.length) break;
        const { pageSize } = options as WidgetComponentProps<"mediaMissing">["options"];
        register(trpc.widget.mediaOrganizer.getData.queryOptions({ integrationIds, pageSize: Number(pageSize) }));
        break;
      }
      case "mediaRequests-requestStats":
        if (integrationIds.length) register(trpc.widget.mediaRequests.getStats.queryOptions({ integrationIds }));
        break;
      case "networkControllerStatus":
        if (integrationIds.length) register(trpc.widget.networkController.summary.queryOptions({ integrationIds }));
        break;
      case "notifications":
        if (integrationIds.length)
          register(trpc.widget.notifications.getNotifications.queryOptions({ ...options, integrationIds }));
        break;
      case "paperlessNgx":
        if (firstIntegrationId)
          register(trpc.widget.paperlessNgx.getStats.queryOptions({ integrationId: firstIntegrationId }));
        break;
      case "patchmon":
        if (isAuthenticated && firstIntegrationId)
          register(trpc.widget.patchmon.getStats.queryOptions({ integrationId: firstIntegrationId }));
        break;
      case "releases": {
        const { repositories } = options as WidgetComponentProps<"releases">["options"];
        const normalizedRepositories = normalizeReleasesRepositories(repositories);
        const linkedIntegrationIds = getReleasesLinkedIntegrationIds(integrationIds, normalizedRepositories);
        if (linkedIntegrationIds.length)
          register(trpc.widget.releases.getServiceVersions.queryOptions({ integrationIds: linkedIntegrationIds }));
        for (const input of getReleasesLatestInputs(item.id, normalizedRepositories))
          register(trpc.widget.releases.getLatest.queryOptions(input));
        break;
      }
      case "speedtestTracker":
        if (integrationIds.length) register(trpc.widget.speedtestTracker.getDashboard.queryOptions({ integrationIds }));
        break;
      case "stats": {
        const { entries } = options as WidgetComponentProps<"stats">["options"];
        const parsedEntries = statsEntriesSchema.safeParse(entries).data ?? [];
        const uniqueIntegrationIds = [...new Set(integrationIds)];
        const visibleIntegrationIds = uniqueIntegrationIds.filter((integrationId) =>
          parsedEntries.some((entry) => !entry.hidden && entry.integrationId === integrationId),
        );
        for (const integrationId of uniqueIntegrationIds)
          register(trpc.widget.stats.catalog.queryOptions({ integrationId }));
        for (const integrationId of visibleIntegrationIds)
          register(trpc.widget.stats.snapshot.queryOptions({ integrationId }));
        break;
      }
      case "stockPrice":
        register(
          trpc.widget.stockPrice.getPriceHistory.queryOptions(options as WidgetComponentProps<"stockPrice">["options"]),
        );
        break;
      case "timetable": {
        const { baseUrl, station } = options as WidgetComponentProps<"timetable">["options"];
        if (station && typeof station.value === "string" && station.value)
          register(
            trpc.widget.timetable.getTimetable.queryOptions({
              baseUrl,
              itemId: item.id,
              stationId: station.value,
              limit: 10,
            }),
          );
        break;
      }
      case "tracearr":
        if (integrationIds.length) register(trpc.widget.tracearr.getDashboard.queryOptions({ integrationIds }));
        break;
      case "traefik":
        if (integrationIds.length) register(trpc.widget.traefik.getDashboard.queryOptions({ integrationIds }));
        break;
      case "umami": {
        const { websiteId, timeFrame, eventName, eventNames, viewMode } =
          options as WidgetComponentProps<"umami">["options"];
        if (!firstIntegrationId || typeof websiteId !== "string" || !websiteId.trim()) break;
        register(
          trpc.widget.umami.getVisitorStats.queryOptions({
            integrationIds,
            websiteId,
            timeFrame,
            eventName: eventName || undefined,
          }),
        );
        register(trpc.widget.umami.getActiveVisitors.queryOptions({ integrationId: firstIntegrationId, websiteId }));
        if (viewMode === "events" && eventNames.length > 0)
          register(
            trpc.widget.umami.getMultiEventTimeSeries.queryOptions({
              integrationId: firstIntegrationId,
              websiteId,
              timeFrame,
              eventNames: [...eventNames].toSorted(),
            }),
          );
        break;
      }
      case "ups":
        if (integrationIds.length) register(trpc.widget.ups.getSummaries.queryOptions({ integrationIds }));
        break;
      case "uptimeKuma":
        if (integrationIds.length) register(trpc.widget.uptimeKuma.getDashboard.queryOptions({ integrationIds }));
        break;
      case "vpn":
        if (integrationIds.length) register(trpc.widget.vpn.getSummaries.queryOptions({ ...options, integrationIds }));
        break;
    }
  };

  for (const item of board.items) {
    if (!capturePrefetchKinds.has(item.kind) || !isInitiallyVisible(board, item, layoutId)) continue;
    if (Date.now() >= deadline) {
      outcome.timedOut++;
      break;
    }
    outcome.eligibleItems++;
    try {
      await registerItem(item);
    } catch {
      outcome.failed++;
    }
  }

  let nextIndex = 0;
  let countedUnstarted = false;
  const worker = async () => {
    while (nextIndex < pending.length) {
      if (Date.now() >= deadline) {
        if (!countedUnstarted) {
          countedUnstarted = true;
          outcome.timedOut += pending.length - nextIndex;
        }
        return;
      }
      const index = nextIndex++;
      const start = pending[index];
      if (!start) continue;
      await start();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()));

  for (const queryKey of admittedKeys) {
    if (queryClient.getQueryCache().find({ queryKey })?.state.status === "error") outcome.failed++;
  }
};
