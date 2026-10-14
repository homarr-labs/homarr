import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { parse, serialize, stringify } from "superjson";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { dehydrate, hashKey, hydrate, QueryClient } from "@tanstack/react-query";
import type { QueryKey } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { persistQueryClientRestore, persistQueryClientSave } from "@tanstack/react-query-persist-client";

import {
  boardSnapshotMaxAgeMs,
  boardSnapshotMaxBytes,
  boardSnapshotVersion,
  createSerializedBoardSnapshotStorage,
} from "@homarr/redis/cache";
import type { SerializedStringCache } from "@homarr/redis/cache";

const snapshotRestoreBudgetMs = 50;
const maxQueryBytes = 128 * 1024;
const maxBeszelStatsBytes = 256 * 1024;

export interface BoardSnapshotBoard {
  readonly id: string;
  readonly items: readonly {
    readonly id: string;
    readonly kind: string;
    readonly integrationIds: readonly string[];
    readonly options: Readonly<Record<string, unknown>>;
  }[];
}

export interface BoardQuerySnapshotPorts {
  cache: SerializedStringCache;
  prepareGenerationsAsync(): Promise<void>;
  getGenerationAsync(integrationId: string): Promise<{ value: string; isShared: boolean }>;
  queryKeyFor(path: readonly string[], input: unknown): QueryKey | null;
}

export interface BoardQuerySnapshot {
  restoreAsync(queryClient: QueryClient): Promise<void>;
  saveAsync(queryClient: QueryClient): Promise<void>;
  stopAsync(): Promise<void>;
}

type CachedQuery = PersistedClient["clientState"]["queries"][number];

interface BoardSnapshot extends PersistedClient {
  generations: Record<string, string>;
}

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

const decodeQueryKey = (key: QueryKey) => {
  let pathIndex = 0;
  if (typeof key[0] === "string") pathIndex = 1;
  if (key.length !== pathIndex + 2) return null;
  const rawPath: unknown = key[pathIndex];
  const details: unknown = key[pathIndex + 1];
  if (!Array.isArray(rawPath)) return null;
  const segments: unknown[] = rawPath;
  const path = segments.filter((segment) => typeof segment === "string");
  if (path.length === 0 || path.length !== segments.length) return null;
  if (!details || typeof details !== "object" || !("type" in details) || details.type !== "query") return null;
  if (Object.keys(details).some((property) => property !== "type" && property !== "input")) return null;
  if (!("input" in details) || !details.input || typeof details.input !== "object") return null;
  return { path, input: details.input };
};

const getQueryIntegrationIds = (queryKey: QueryKey, board: BoardSnapshotBoard) => {
  const decoded = decodeQueryKey(queryKey);
  if (!decoded) return null;
  const { path, input } = decoded;
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
    if (matchesBoardItem) return [];
    return null;
  }
  if (!sharedWidgetPaths.has(path.join("."))) return null;
  if ("integrationIds" in input && Array.isArray(input.integrationIds)) {
    const ids: unknown[] = input.integrationIds;
    const integrationIds = ids.filter((id) => typeof id === "string");
    if (integrationIds.length === 0 || integrationIds.length !== ids.length) return null;
    return integrationIds;
  }
  if ("integrationId" in input && typeof input.integrationId === "string") return [input.integrationId];
  return null;
};

const getShareableQueries = (
  queries: CachedQuery[],
  board: BoardSnapshotBoard,
  boardIntegrationIds: Set<string>,
  allowedIds: Set<string>,
) => {
  let totalBytes = 0;
  return queries.filter((query) => {
    if (query.meta?.rscWidgetPrefetch !== true || query.state.status !== "success") return false;
    const ids = getQueryIntegrationIds(query.queryKey, board);
    if (!ids?.every((id) => boardIntegrationIds.has(id) && allowedIds.has(id))) return false;
    const serialized = stringify({ key: query.queryKey, data: query.state.data });
    const queryBytes = Buffer.byteLength(serialized);
    let limit = maxQueryBytes;
    if (decodeQueryKey(query.queryKey)?.path.join(".") === "widget.beszel.getSystemStats") limit = maxBeszelStatsBytes;
    if (queryBytes > limit || /data:[^,]{0,100};base64,/i.test(serialized)) return false;
    if (totalBytes + queryBytes > boardSnapshotMaxBytes) return false;
    totalBytes += queryBytes;
    return true;
  });
};

const hasGenerations = (snapshot: PersistedClient): snapshot is BoardSnapshot => {
  if (!("generations" in snapshot) || !snapshot.generations || typeof snapshot.generations !== "object") return false;
  if (Array.isArray(snapshot.generations)) return false;
  return Object.values(snapshot.generations).every((value) => typeof value === "string");
};

export const createBoardQuerySnapshot = (
  board: BoardSnapshotBoard,
  integrations: readonly { id: string }[],
  ports: BoardQuerySnapshotPorts,
): BoardQuerySnapshot => {
  const boardContentFingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        board.items.map(({ id, kind, integrationIds, options }) => ({ id, kind, integrationIds, options })),
      ),
    )
    .digest("hex");
  const boardIntegrationIds = new Set(board.items.flatMap((item) => [...item.integrationIds]));
  const existingIds = new Set(integrations.map((entry) => entry.id));
  const allowedIds = new Set([...boardIntegrationIds].filter((id) => existingIds.has(id)));
  const canSeedBoardSnapshot = [...boardIntegrationIds].every((id) => allowedIds.has(id));
  const pending = new Set<Promise<void>>();
  const restores = new Set<Promise<void>>();
  let accepting = true;
  let stopPromise: Promise<void> | undefined;
  let saveSettlement: Promise<void> = Promise.resolve();

  const track = <T>(operation: Promise<T>): Promise<T> => {
    const settlement = operation.then(
      () => undefined,
      () => undefined,
    );
    pending.add(settlement);
    void settlement.then(() => pending.delete(settlement));
    return operation;
  };

  const runAsync = (executeAsync: () => Promise<void>) => {
    if (!accepting) return Promise.reject(new Error("The board query snapshot is stopping or stopped"));
    return track(Promise.resolve().then(executeAsync));
  };

  const getGenerationsAsync = async (ids: Set<string>) => {
    const entries = await Promise.all(
      [...ids].map(
        async (id) =>
          [id, await track(Promise.resolve().then(async () => await ports.getGenerationAsync(id)))] as const,
      ),
    );
    if (entries.some(([, generation]) => !generation.isShared)) return null;
    return Object.fromEntries(entries.map(([id, generation]) => [id, generation.value]));
  };

  const storage = createSerializedBoardSnapshotStorage(ports.cache, { boardId: board.id, boardContentFingerprint });
  const initialGenerationsPromise = track(
    Promise.resolve()
      .then(async () => await ports.prepareGenerationsAsync())
      .then(async () => await getGenerationsAsync(boardIntegrationIds))
      .catch(() => null),
  );
  const storagePersister = createAsyncStoragePersister({
    key: board.id,
    throttleTime: 0,
    serialize: stringify,
    deserialize: parse,
    storage,
  });
  const persister = {
    ...storagePersister,
    restoreClient: async () => {
      const snapshot = await storagePersister.restoreClient();
      if (!snapshot || !hasGenerations(snapshot)) return undefined;
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
      const snapshot: BoardSnapshot = { ...client, generations, clientState: { mutations: [], queries } };
      await storagePersister.persistClient(snapshot);
    },
  };

  return {
    restoreAsync: (queryClient) =>
      runAsync(async () => {
        const restoredClient = new QueryClient();
        const restore = track(
          persistQueryClientRestore({
            queryClient: restoredClient,
            persister: {
              ...persister,
              restoreClient: async () => {
                const snapshot = await persister.restoreClient();
                if (!snapshot) return undefined;
                const queries = snapshot.clientState.queries.flatMap((query) => {
                  const source = decodeQueryKey(query.queryKey);
                  if (!source) return [];
                  const queryKey = ports.queryKeyFor(source.path, source.input);
                  if (!queryKey) return [];
                  const target = decodeQueryKey(queryKey);
                  if (!target || target.path.join(".") !== source.path.join(".")) return [];
                  if (hashKey([serialize(target.input)]) !== hashKey([serialize(source.input)])) return [];
                  const queryHash = queryClient.defaultQueryOptions({ queryKey }).queryHash;
                  return [{ ...query, queryKey, queryHash }];
                });
                return {
                  ...snapshot,
                  clientState: {
                    mutations: [],
                    queries: getShareableQueries(queries, board, boardIntegrationIds, allowedIds),
                  },
                };
              },
            },
            maxAge: boardSnapshotMaxAgeMs,
            buster: boardSnapshotVersion,
          })
            .then(() => dehydrate(restoredClient))
            .finally(() => restoredClient.clear()),
        );
        const settlement = restore.then(
          () => undefined,
          () => undefined,
        );
        restores.add(settlement);
        void settlement.then(() => restores.delete(settlement));
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          const state = await Promise.race([
            restore,
            new Promise<null>((resolve) => {
              timeout = setTimeout(() => resolve(null), snapshotRestoreBudgetMs);
            }),
          ]);
          if (state && accepting) hydrate(queryClient, state);
        } finally {
          clearTimeout(timeout);
        }
      }),
    saveAsync: (queryClient) =>
      runAsync(async () => {
        const save = saveSettlement.then(async () => {
          await Promise.all(restores);
          await persistQueryClientSave({
            queryClient,
            persister,
            buster: boardSnapshotVersion,
            dehydrateOptions: {
              shouldDehydrateMutation: () => false,
              shouldDehydrateQuery: (query) =>
                query.meta?.rscWidgetPrefetch === true && query.state.status === "success",
            },
          });
        });
        saveSettlement = save.then(
          () => undefined,
          () => undefined,
        );
        await save;
      }),
    stopAsync: () => {
      if (stopPromise) return stopPromise;
      accepting = false;
      stopPromise = (async () => {
        while (pending.size > 0) await Promise.all(pending);
      })();
      return stopPromise;
    },
  };
};
