import type { AsyncStorage, PersistedQuery } from "@tanstack/query-persist-client-core";
import { experimental_createQueryPersister } from "@tanstack/query-persist-client-core";
import { parse, stringify } from "superjson";

import { fetchApi } from "@homarr/api/client";
import {
  getActiveQueryCacheBoardId,
  isPersistableWidgetQueryKey,
  queryCacheStoragePrefix,
} from "@homarr/api/query-cache";

const queryCacheStorage = {
  async getItem(_key) {
    return null;
  },
  async setItem(key, value) {
    const boardId = getActiveQueryCacheBoardId();
    if (!boardId) return;

    try {
      await fetchApi.queryCache.setItem.mutate({ boardId, key, value });
    } catch {
      // Query persistence is best-effort; failed writes should not affect widget rendering.
    }
  },
  async removeItem(key) {
    const boardId = getActiveQueryCacheBoardId();
    if (!boardId) return;

    try {
      await fetchApi.queryCache.removeItem.mutate({ boardId, key });
    } catch {
      // Query persistence is best-effort; failed removals should not affect widget rendering.
    }
  },
} satisfies AsyncStorage<string>;

export const createWidgetQueryPersister = () =>
  experimental_createQueryPersister<string>({
    storage: typeof window === "undefined" ? undefined : queryCacheStorage,
    maxAge: Number.POSITIVE_INFINITY,
    prefix: queryCacheStoragePrefix,
    refetchOnRestore: true,
    serialize: (query) => stringify(query),
    deserialize: (value) => parse<PersistedQuery>(value),
    filters: {
      predicate: (query) => isPersistableWidgetQueryKey(query.queryKey),
    },
  });
