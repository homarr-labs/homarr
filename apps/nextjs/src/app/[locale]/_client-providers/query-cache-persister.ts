import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import superjson from "superjson";

import { fetchApi } from "@homarr/api/client";
import { getActiveQueryCacheBoardId, queryCacheStoragePrefix } from "@homarr/api/query-cache";

const queryCacheStorage = {
  getItem: (_key: string) => null as string | null,
  async setItem(_key: string, value: string) {
    const boardId = getActiveQueryCacheBoardId();
    if (!boardId) return;
    await fetchApi.queryCache.setItem.mutate({ boardId, value }).catch((error) => {
      console.warn("[query-cache] persist failed", error);
    });
  },
  async removeItem(_key: string) {
    const boardId = getActiveQueryCacheBoardId();
    if (!boardId) return;
    await fetchApi.queryCache.removeItem.mutate({ boardId }).catch((error) => {
      console.warn("[query-cache] remove failed", error);
    });
  },
};

export const createWidgetQueryPersister = () =>
  createAsyncStoragePersister({
    storage: typeof window === "undefined" ? undefined : queryCacheStorage,
    key: queryCacheStoragePrefix,
    throttleTime: 2000,
    serialize: (data) => superjson.stringify(data),
    deserialize: (data) => superjson.parse(data),
  });
