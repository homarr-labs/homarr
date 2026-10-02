import { setImmediate } from "node:timers/promises";

import type { FetchQueryOptions, QueryClient, QueryKey } from "@tanstack/react-query";

import type { RouterInputs, RouterOutputs } from "@homarr/api";
import { api, trpc } from "@homarr/api/server";
import { radarrReleaseTypes } from "@homarr/integrations/types";

import {
  createBeszelSystemChoices,
  resolveBeszelSystemChoice,
  resolveStoredBeszelQuerySelection,
} from "./beszel-system-stats/selection";
import { ALL_PHOTOS_ALBUM_ID } from "./immich/album-carousel/constants";

const prefetchQuery = <TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) => {
  const queryFn = options.queryFn;
  if (typeof queryFn !== "function") return;
  // Register every pending promise now, and let React flush the shell before
  // query middleware and integration initialization consume the server thread.
  void queryClient.prefetchQuery({
    ...options,
    meta: { ...options.meta, rscWidgetPrefetch: true },
    // A restored board snapshot supplies the first paint while this request
    // refreshes the value on the server for the current navigation.
    staleTime: 0,
    queryFn: async (context) => {
      await setImmediate();
      await setImmediate();
      return await queryFn(context);
    },
  });
};

type Board = RouterOutputs["board"]["getHomeBoard"];
type Item = Board["items"][number];
type BeszelStatsInput = RouterInputs["widget"]["beszel"]["getSystemStats"];
const mediaRequestStatuses = ["pending", "approved", "declined", "failed", "completed"] as const;
const beszelPeriods = ["1m", "1h", "12h", "24h", "1w", "30d"] as const;

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

const prefetchBeszelStats = (queryClient: QueryClient, item: Item) => {
  const { integrationIds, options } = item;
  const storedValue = String(options.systemId ?? "");
  const selection = resolveStoredBeszelQuerySelection(storedValue, integrationIds);
  const timePeriod = beszelPeriods.find((period) => period === (options.timePeriod ?? "1h"));
  if (!timePeriod || timePeriod === "1m") return;
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
        prefetchQuery(queryClient, {
          ...trpc.widget.beszel.getSystemStats.queryOptions({
            integrationIds: [selected.integrationId],
            systemId: selected.systemId,
            timePeriod,
            includeDocker,
          }),
          meta: { streamedBeszelSelection: true },
        });
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
  prefetchQuery(queryClient, {
    ...query,
    queryFn: async () => {
      const systems = await queryClient.fetchQuery(trpc.widget.beszel.getSystems.queryOptions({ integrationIds }));
      const selected = resolveBeszelSystemChoice(createBeszelSystemChoices(systems), storedValue);
      if (!selected || selected.systemId !== input.systemId || selected.integrationId !== input.integrationIds[0]) {
        throw new Error("The selected Beszel system is no longer available");
      }
      return await api.widget.beszel.getSystemStats(input);
    },
  });
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
          const discovery = prefetchBeszelStats(queryClient, item);
          if (discovery) dependentQueries.push(discovery);
        }
        break;
      case "downloads":
        if (integrationIds.length)
          prefetchQuery(
            queryClient,
            trpc.widget.downloads.getJobsAndStatuses.queryOptions({
              integrationIds,
              limitPerIntegration: Number(options.limitPerIntegration ?? 50),
            }),
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
