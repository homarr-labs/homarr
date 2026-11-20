import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { parse, stringify } from "superjson";
import { dehydrate, hydrate } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

import type { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import {
  createGetSetChannel,
  createLockChannel,
  getIntegrationCacheGenerationAsync,
  prepareIntegrationResponseCacheAsync,
} from "@homarr/redis";

import type { Board } from "../_types";

const snapshotMaxAgeMs = 3 * 24 * 60 * 60 * 1000;
const snapshotRestoreBudgetMs = 50;
const maxQueryBytes = 128 * 1024;
const maxBeszelStatsBytes = 256 * 1024;
const maxSnapshotBytes = 512 * 1024;
const snapshotVersion = "board-widget-queries-v2";

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
    if (!("descriptionMaxLength" in input) || typeof input.descriptionMaxLength !== "number") return null;
    const urls: unknown[] = input.urls;
    const matchesBoardItem = board.items.some((item) => {
      if (item.kind !== "rssFeed" || !Array.isArray(item.options.feedUrls)) return false;
      if (Number(item.options.maximumAmountPosts ?? 100) !== input.maximumAmountPosts) return false;
      if (Number(item.options.descriptionMaxLength ?? 250) !== input.descriptionMaxLength) return false;
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
    if (query.state.dataUpdatedAt < Date.now() - snapshotMaxAgeMs) return false;
    const ids = getQueryIntegrationIds(query.queryKey, board);
    if (!ids?.every((id) => boardIntegrationIds.has(id) && allowedIds.has(id))) return false;
    const serialized = stringify({ key: query.queryKey, data: query.state.data });
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
  // A board edit must not restore data from a widget that has since been
  // removed or reconfigured, even if another widget uses the same integration.
  const boardContentFingerprint = createHash("sha256")
    .update(
      JSON.stringify(
        board.items.map(({ id, kind, integrationIds, options }) => ({ id, kind, integrationIds, options })),
      ),
    )
    .digest("hex");
  const boardIntegrationIds = new Set(board.items.flatMap((item) => item.integrationIds));
  // The board procedure has already granted view access. Integration query
  // authorization also grants use of integrations placed on a viewable board.
  const existingIds = new Set(integrations.map((entry) => entry.id));
  const allowedIds = new Set([...boardIntegrationIds].filter((id) => existingIds.has(id)));
  const canSeedBoardSnapshot = [...boardIntegrationIds].every((id) => allowedIds.has(id));
  const initialGenerationsPromise = prepareIntegrationResponseCacheAsync()
    .then(async () => await getGenerationsAsync(boardIntegrationIds))
    .catch(() => null);
  const snapshotKey = `${snapshotVersion}:${board.id}:${boardContentFingerprint}`;
  const cacheOptions = { useBoundedCacheClient: true };
  const channel = createGetSetChannel<string>(snapshotKey, cacheOptions);
  const lock = createLockChannel(`${snapshotKey}:lock`, cacheOptions);
  const readQueriesAsync = async () => {
    const serialized = await channel.getAsync();
    if (!serialized) return [];
    const snapshot = parse<BoardSnapshot>(serialized);
    if (
      snapshot.buster !== snapshotVersion ||
      Date.now() - snapshot.timestamp > snapshotMaxAgeMs ||
      !snapshot.generations
    )
      return [];
    const generations = await initialGenerationsPromise;
    if (!generations) return [];
    return getShareableQueries(snapshot.clientState.queries, board, boardIntegrationIds, allowedIds).filter((query) =>
      getQueryIntegrationIds(query.queryKey, board)?.every((id) => generations[id] === snapshot.generations[id]),
    );
  };

  return {
    restoreAsync: async (queryClient: QueryClient) => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const queries = await Promise.race([
          readQueriesAsync(),
          new Promise<null>((resolve) => {
            timeout = setTimeout(() => resolve(null), snapshotRestoreBudgetMs);
          }),
        ]);
        if (queries)
          hydrate(queryClient, {
            mutations: [],
            queries: queries.map((query) => ({ ...query, state: { ...query.state, fetchStatus: "idle" } })),
          });
      } finally {
        clearTimeout(timeout);
      }
    },
    saveAsync: async (queryClient: QueryClient) => {
      if (!canSeedBoardSnapshot) return;
      const current = dehydrate(queryClient, {
        shouldDehydrateMutation: () => false,
        shouldDehydrateQuery: (query) => query.meta?.rscWidgetPrefetch === true && query.state.status === "success",
      });
      if (current.queries.length === 0) return;
      let token = await lock.acquireAsync(5);
      for (const wait of [25, 50, 100]) {
        if (token) break;
        await delay(wait);
        token = await lock.acquireAsync(5);
      }
      if (!token) return;
      try {
        const latest = await readQueriesAsync();
        const queries = new Map(current.queries.map((query) => [query.queryHash, query]));
        for (const query of latest) {
          const currentQuery = queries.get(query.queryHash);
          if (!currentQuery || currentQuery.state.dataUpdatedAt < query.state.dataUpdatedAt) {
            queries.set(query.queryHash, query);
          }
        }
        const shareable = getShareableQueries([...queries.values()], board, boardIntegrationIds, allowedIds);
        const [initialGenerations, generations] = await Promise.all([
          initialGenerationsPromise,
          getGenerationsAsync(boardIntegrationIds),
        ]);
        if (
          !initialGenerations ||
          !generations ||
          [...boardIntegrationIds].some((id) => initialGenerations[id] !== generations[id])
        )
          return;
        const serialized = stringify({
          timestamp: Date.now(),
          buster: snapshotVersion,
          generations,
          clientState: { mutations: [], queries: shareable },
        } satisfies BoardSnapshot);
        if (shareable.length > 0 && Buffer.byteLength(serialized) <= maxSnapshotBytes) {
          await lock.setIfOwnedAsync(token, snapshotKey, serialized, snapshotMaxAgeMs);
        }
      } finally {
        await lock.releaseAsync(token);
      }
    },
  };
};
