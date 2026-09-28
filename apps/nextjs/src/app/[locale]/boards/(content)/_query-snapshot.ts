import superjson from "superjson";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { persistQueryClientRestore, persistQueryClientSave } from "@tanstack/react-query-persist-client";

import type { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import {
  createGetSetChannel,
  getIntegrationCacheGenerationAsync,
  prepareIntegrationResponseCacheAsync,
} from "@homarr/redis";

import type { Board } from "../_types";

const snapshotMaxAgeMs = 3 * 24 * 60 * 60 * 1000;
const maxQueryBytes = 128 * 1024;
const maxBeszelStatsBytes = 256 * 1024;
const maxSnapshotBytes = 512 * 1024;
const snapshotVersion = "board-widget-queries-v1";

type Integrations = Awaited<ReturnType<typeof getIntegrationsWithPermissionsAsync>>;
type CachedQuery = PersistedClient["clientState"]["queries"][number];
interface BoardSnapshot extends PersistedClient {
  generations: Record<string, string>;
}

// Only data shared by viewers of this board enters the snapshot. Browser-specific
// queries stay out; RSS inputs must match the current board on save and restore.
const sharedWidgetPaths = new Set([
  "widget.dnsHole.summary",
  "widget.beszel.getSystems",
  "widget.beszel.getSystemStats",
  "widget.downloads.getJobsAndStatuses",
  "widget.indexerManager.getIndexersStatus",
  "widget.mediaRelease.getMediaReleases",
  "widget.mediaServer.getCurrentStreams",
  "widget.mediaRequests.getLatestRequests",
  "widget.immich.getServerStats",
  "widget.immich.getAlbumPreview",
  "widget.immich.getAlbum",
  "widget.calendar.findAllEvents",
]);

const getQueryIntegrationIds = (queryKey: QueryKey, board: Board) => {
  const path = queryKey[0];
  if (!Array.isArray(path)) return null;
  const details = queryKey[1];
  if (!details || typeof details !== "object" || !("input" in details)) return null;
  const input = details.input;
  if (!input || typeof input !== "object") return null;
  if (path.join(".") === "widget.rssFeed.getFeeds") {
    if (!("urls" in input) || !Array.isArray(input.urls)) return null;
    if (!("maximumAmountPosts" in input) || typeof input.maximumAmountPosts !== "number") return null;
    const urls: unknown[] = input.urls;
    const matchesBoardItem = board.items.some((item) => {
      if (item.kind !== "rssFeed" || !Array.isArray(item.options.feedUrls)) return false;
      if (Number(item.options.maximumAmountPosts ?? 100) !== input.maximumAmountPosts) return false;
      return (
        item.options.feedUrls.length === urls.length && item.options.feedUrls.every((url, index) => url === urls[index])
      );
    });
    return matchesBoardItem ? [] : null;
  }
  if (!sharedWidgetPaths.has(path.join("."))) return null;
  if ("integrationIds" in input && Array.isArray(input.integrationIds)) {
    if (input.integrationIds.length === 0 || !input.integrationIds.every((id) => typeof id === "string")) return null;
    return input.integrationIds as string[];
  }
  if ("integrationId" in input && typeof input.integrationId === "string") return [input.integrationId];
  return null;
};

const getShareableQueries = (
  queries: CachedQuery[],
  board: Board,
  boardIntegrationIds: Set<string>,
  allowedIds: Set<string>,
) => {
  let totalBytes = 0;
  return queries.filter((query) => {
    if (query.meta?.rscWidgetPrefetch !== true || query.state.status !== "success") return false;
    const ids = getQueryIntegrationIds(query.queryKey, board);
    if (!ids?.every((id) => boardIntegrationIds.has(id) && allowedIds.has(id))) return false;
    const serialized = superjson.stringify({ key: query.queryKey, data: query.state.data });
    const queryBytes = Buffer.byteLength(serialized);
    const path = query.queryKey[0];
    let limit = maxQueryBytes;
    if (Array.isArray(path) && path.join(".") === "widget.beszel.getSystemStats") limit = maxBeszelStatsBytes;
    if (queryBytes > limit || /data:[^,]{0,100};base64,/i.test(serialized)) return false;
    if (totalBytes + queryBytes > maxSnapshotBytes) return false;
    totalBytes += queryBytes;
    return true;
  });
};

const getGenerationsAsync = async (ids: Set<string>) => {
  const entries = await Promise.all(
    [...ids].map(async (id) => [id, await getIntegrationCacheGenerationAsync(id)] as const),
  );
  if (entries.some(([, generation]) => !generation.isShared)) return null;
  return Object.fromEntries(entries.map(([id, generation]) => [id, generation.value]));
};

export const createBoardQuerySnapshot = (board: Board, integrations: Integrations) => {
  const boardIntegrationIds = new Set(board.items.flatMap((item) => item.integrationIds));
  // The board procedure has already granted view access. Integration query
  // authorization also grants use of integrations placed on a viewable board.
  const existingIds = new Set(integrations.map((entry) => entry.id));
  const allowedIds = new Set([...boardIntegrationIds].filter((id) => existingIds.has(id)));
  const canSeedBoardSnapshot = [...boardIntegrationIds].every((id) => allowedIds.has(id));
  const initialGenerationsPromise = prepareIntegrationResponseCacheAsync()
    .then(async () => await getGenerationsAsync(boardIntegrationIds))
    .catch(() => null);
  const channel = createGetSetChannel<string>(`${snapshotVersion}:${board.id}`, { useBoundedCacheClient: true });
  const redisPersister = createAsyncStoragePersister({
    key: board.id,
    throttleTime: 0,
    serialize: superjson.stringify,
    deserialize: superjson.parse,
    storage: {
      getItem: async () => await channel.getAsync(),
      setItem: async (_key, value) => {
        if (Buffer.byteLength(value) > maxSnapshotBytes) return;
        await channel.setAsync(value, { ttlMs: snapshotMaxAgeMs });
      },
      removeItem: async () => await channel.removeAsync(),
    },
  });
  const persister = {
    ...redisPersister,
    restoreClient: async () => {
      const snapshot = (await redisPersister.restoreClient()) as BoardSnapshot | undefined;
      if (!snapshot || !snapshot.generations) return undefined;
      const generations = await initialGenerationsPromise;
      if (!generations) return undefined;
      const queries = getShareableQueries(snapshot.clientState.queries, board, boardIntegrationIds, allowedIds).filter(
        (query) =>
          getQueryIntegrationIds(query.queryKey, board)?.every((id) => generations[id] === snapshot.generations[id]),
      );
      return {
        ...snapshot,
        clientState: {
          mutations: [],
          queries: queries.map((query) => ({
            ...query,
            state: { ...query.state, dataUpdatedAt: Date.now(), fetchStatus: "idle" as const },
          })),
        },
      };
    },
    persistClient: async (client: PersistedClient) => {
      if (!canSeedBoardSnapshot) return;
      const queries = getShareableQueries(client.clientState.queries, board, boardIntegrationIds, allowedIds);
      if (queries.length === 0) return;
      const ids = new Set(queries.flatMap((query) => getQueryIntegrationIds(query.queryKey, board) ?? []));
      const [initialGenerations, generations] = await Promise.all([
        initialGenerationsPromise,
        getGenerationsAsync(ids),
      ]);
      if (!initialGenerations || !generations) return;
      if ([...ids].some((id) => initialGenerations[id] !== generations[id])) return;
      await redisPersister.persistClient({
        ...client,
        generations,
        clientState: { mutations: [], queries },
      } as BoardSnapshot);
    },
  };

  return {
    restoreAsync: async (queryClient: QueryClient) => {
      await persistQueryClientRestore({ queryClient, persister, maxAge: snapshotMaxAgeMs, buster: snapshotVersion });
    },
    saveAsync: async (queryClient: QueryClient) => {
      await persistQueryClientSave({
        queryClient,
        persister,
        buster: snapshotVersion,
        dehydrateOptions: {
          shouldDehydrateMutation: () => false,
          shouldDehydrateQuery: (query) => query.meta?.rscWidgetPrefetch === true && query.state.status === "success",
        },
      });
    },
  };
};
