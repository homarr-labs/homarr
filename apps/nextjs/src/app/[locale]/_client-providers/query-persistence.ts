import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { removeOldestQuery } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { parse, stringify } from "superjson";

import { isWidgetDataQueryKey, queryCacheDefaultGcTimeMs } from "@homarr/api/query-cache";

export const queryPersistenceMaxAgeMs = queryCacheDefaultGcTimeMs;
export const queryPersistenceMaxDataBytes = 256 * 1024;
const queryPersistenceBuster = "v1-session-superjson";

const queryPersistenceStoragePrefix = "homarr:widget-query-cache:v1";

const hashScope = (scope: string) => {
  let hash = 2_166_136_261;
  for (let index = 0; index < scope.length; index += 1) {
    hash ^= scope.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
};

export const getQueryPersistenceStorageKey = (scope: string | null) =>
  `${queryPersistenceStoragePrefix}:${hashScope(scope ?? "anonymous")}`;

export const getQueryPersistenceBuster = (scope: string | null) => `${queryPersistenceBuster}:${scope ?? "anonymous"}`;

interface PersistableQuery {
  queryHash?: string;
  queryKey: QueryKey;
  state: {
    data: unknown;
    dataUpdatedAt: number;
    status: string;
  };
}

type RestoredDashboardQueryPredicate = (query: PersistableQuery) => boolean;

export interface SessionQueryPersister extends Persister {
  takeRestoredDashboardQueryPredicate: () => RestoredDashboardQueryPredicate | undefined;
}

export const shouldPersistDashboardQuery = (query: PersistableQuery) => {
  if (query.state.data === undefined || query.state.dataUpdatedAt <= 0 || !isWidgetDataQueryKey(query.queryKey)) {
    return false;
  }

  try {
    return new TextEncoder().encode(stringify(query.state.data)).byteLength <= queryPersistenceMaxDataBytes;
  } catch {
    return false;
  }
};

const sanitizePersistedClient = (client: PersistedClient): PersistedClient => ({
  ...client,
  clientState: {
    mutations: [],
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

const getSessionStorage = (): Storage | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
};

const removeStorageItem = (storage: Storage | undefined, key: string) => {
  try {
    storage?.removeItem(key);
  } catch {
    // Persistence is optional. Treat blocked or unavailable storage as an empty cache.
  }
};

export const createSessionQueryPersister = (
  scope: string | null,
  storage: Storage | undefined = getSessionStorage(),
): SessionQueryPersister => {
  const key = getQueryPersistenceStorageKey(scope);
  const buster = getQueryPersistenceBuster(scope);
  let restoredQueries = new Map<string, number>();
  const persister = createSyncStoragePersister({
    storage,
    key,
    retry: removeOldestQuery,
    serialize: (client) => stringify(sanitizePersistedClient(client)),
    deserialize: (value) => parse<PersistedClient>(value),
  });

  return {
    ...persister,
    async restoreClient() {
      restoredQueries = new Map();
      try {
        const client = await persister.restoreClient();
        if (
          client &&
          client.timestamp > 0 &&
          Date.now() - client.timestamp <= queryPersistenceMaxAgeMs &&
          client.buster === buster
        ) {
          restoredQueries = new Map(
            client.clientState.queries.map((query) => [query.queryHash, query.state.dataUpdatedAt]),
          );
        }
        return client;
      } catch {
        removeStorageItem(storage, key);
        return undefined;
      }
    },
    removeClient() {
      restoredQueries = new Map();
      removeStorageItem(storage, key);
    },
    takeRestoredDashboardQueryPredicate() {
      if (restoredQueries.size === 0) return undefined;
      const restoredSnapshot = restoredQueries;
      restoredQueries = new Map();
      return (query) =>
        query.queryHash !== undefined &&
        restoredSnapshot.get(query.queryHash) === query.state.dataUpdatedAt &&
        shouldPersistDashboardQuery(query);
    },
  };
};

export const scheduleRestoredDashboardQueryRefresh = (queryClient: QueryClient, persister: SessionQueryPersister) => {
  const predicate = persister.takeRestoredDashboardQueryPredicate();
  if (!predicate) return;

  setTimeout(() => {
    void queryClient.invalidateQueries({ type: "active", predicate });
  }, 0);
};

export const removeSessionQueryCache = (scope: string | null, storage: Storage | undefined = getSessionStorage()) => {
  removeStorageItem(storage, getQueryPersistenceStorageKey(scope));
};
