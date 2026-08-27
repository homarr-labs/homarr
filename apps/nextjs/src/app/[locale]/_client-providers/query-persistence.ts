import type { QueryKey } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { removeOldestQuery } from "@tanstack/react-query-persist-client";
import type { PersistedClient, PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import { parse, stringify } from "superjson";

import { isPersistableDashboardQueryKey, queryCacheDefaultGcTimeMs } from "@homarr/api/query-cache";

export const queryPersistenceBuster = "v6-dashboard-data";

const queryPersistenceStoragePrefix = "homarr:widget-query-cache";

export const getQueryPersistenceStorageKey = (scope: string | null) =>
  `${queryPersistenceStoragePrefix}:${encodeURIComponent(scope ?? "anonymous")}`;

interface PersistableQuery {
  queryKey: QueryKey;
  state: { data: unknown; status: string };
}

export const shouldPersistDashboardQuery = (query: PersistableQuery) =>
  query.state.data !== undefined && isPersistableDashboardQueryKey(query.queryKey);

const serializePersistedClient = (client: PersistedClient) =>
  stringify({
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries.map((query) => ({
        ...query,
        state: {
          ...query.state,
          error: null,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          fetchFailureReason: null,
          status: "success",
        },
      })),
    },
  });

const getSessionStorage = () => {
  if (typeof window === "undefined") return undefined;

  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

const protectStorage = (storage: Storage | undefined) => {
  if (!storage) return undefined;

  return {
    getItem(key: string) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string) {
      storage.setItem(key, value);
    },
    removeItem(key: string) {
      try {
        storage.removeItem(key);
      } catch {
        return undefined;
      }
    },
  };
};

export type SessionQueryPersistence = PersistQueryClientProviderProps["persistOptions"];

export const createSessionQueryPersistence = (
  scope: string | null,
  storage: Storage | undefined = getSessionStorage(),
): SessionQueryPersistence => ({
  persister: createSyncStoragePersister({
    storage: protectStorage(storage),
    key: getQueryPersistenceStorageKey(scope),
    serialize: serializePersistedClient,
    deserialize: parse,
    retry: removeOldestQuery,
  }),
  maxAge: queryCacheDefaultGcTimeMs,
  buster: queryPersistenceBuster,
  dehydrateOptions: {
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: shouldPersistDashboardQuery,
  },
});
