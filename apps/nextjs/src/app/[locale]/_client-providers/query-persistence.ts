import type { QueryKey } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { removeOldestQuery } from "@tanstack/react-query-persist-client";
import type { PersistedClient, PersistQueryClientProviderProps } from "@tanstack/react-query-persist-client";
import { parse, stringify } from "superjson";

import { isPersistableDashboardQueryKey, queryCacheDefaultGcTimeMs } from "@homarr/api/query-cache";

export const queryPersistenceBuster = "v8-dashboard-data";

const queryPersistenceStoragePrefix = "homarr:widget-query-cache";
const maxQueryCharacters = 64 * 1024;

export const getQueryPersistenceStorageKey = (scope: string | null) =>
  `${queryPersistenceStoragePrefix}:${encodeURIComponent(scope ?? "anonymous")}`;

interface PersistableQuery {
  queryKey: QueryKey;
  state: { data: unknown; status: string };
}

export const shouldPersistDashboardQuery = (query: PersistableQuery) => {
  if (query.state.data === undefined || !isPersistableDashboardQueryKey(query.queryKey)) return false;
  const serialized = stringify(query.state.data);
  if (serialized.length > maxQueryCharacters) return false;
  if (/data:[^,]{0,100};base64,/i.test(serialized)) return false;
  if (/"[A-Za-z0-9+/]{512,}={0,2}"/.test(serialized)) return false;
  return !/"[^"\\]{8192}/.test(serialized);
};

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

const clearLegacyLocalStorageQueries = () => {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key?.startsWith(`${queryPersistenceStoragePrefix}:`)) storage.removeItem(key);
    }
  } catch {
    // Private browsing and locked-down browsers may deny access to storage.
  }
};

export const createSessionQueryPersistence = (
  scope: string | null,
  storage: Storage | undefined = getSessionStorage(),
): SessionQueryPersistence => {
  clearLegacyLocalStorageQueries();

  return {
    persister: createSyncStoragePersister({
      storage: scope ? protectStorage(storage) : undefined,
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
  };
};
