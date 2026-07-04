import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { TRPCClientError } from "@trpc/client";
import superjson from "superjson";

import { fetchApi } from "@homarr/api/client";
import { getActiveQueryCacheBoardId, queryCacheStoragePrefix } from "@homarr/api/query-cache";

// Set once the server rejects a persist mutation as read-only (demo mode),
// so we stop retrying a mutation that can never succeed.
let persistDisabled = false;

const isReadOnlyError = (error: unknown) => error instanceof TRPCClientError && error.data?.code === "FORBIDDEN";

const queryCacheStorage = {
  getItem: (_key: string) => null as string | null,
  async setItem(_key: string, value: string) {
    if (persistDisabled) return;
    const boardId = getActiveQueryCacheBoardId();
    if (!boardId) return;
    await fetchApi.queryCache.setItem.mutate({ boardId, value }).catch((error) => {
      if (isReadOnlyError(error)) {
        persistDisabled = true;
        return;
      }
      console.warn("[query-cache] persist failed", error);
    });
  },
  async removeItem(_key: string) {
    if (persistDisabled) return;
    const boardId = getActiveQueryCacheBoardId();
    if (!boardId) return;
    await fetchApi.queryCache.removeItem.mutate({ boardId }).catch((error) => {
      if (isReadOnlyError(error)) {
        persistDisabled = true;
        return;
      }
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
