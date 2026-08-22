import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { removeOldestQuery } from "@tanstack/react-query-persist-client";
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
  flush: () => void;
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

type DehydratedQuery = PersistedClient["clientState"]["queries"][number];

const sanitizePersistedQuery = (query: DehydratedQuery): DehydratedQuery => ({
  ...query,
  state: {
    ...query.state,
    error: null,
    errorUpdateCount: 0,
    errorUpdatedAt: 0,
    fetchFailureCount: 0,
    fetchFailureReason: null,
    fetchStatus: "idle",
    status: "success",
  },
});

const sanitizePersistedClient = (client: PersistedClient): PersistedClient => ({
  ...client,
  clientState: {
    mutations: [],
    // Keep this guard inside the persister as well as in the provider's
    // dehydration options so a future caller cannot accidentally store an
    // unrelated query payload.
    queries: client.clientState.queries
      .filter((query) => shouldPersistDashboardQuery(query as PersistableQuery))
      .map(sanitizePersistedQuery),
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRestorableQuery = (value: unknown): value is DehydratedQuery => {
  if (!isRecord(value) || typeof value.queryHash !== "string" || !Array.isArray(value.queryKey)) return false;
  if (!isRecord(value.state) || typeof value.state.status !== "string") return false;

  return shouldPersistDashboardQuery(value as unknown as PersistableQuery);
};

const sanitizeRestoredClient = (value: unknown): PersistedClient | undefined => {
  if (!isRecord(value) || !Number.isFinite(value.timestamp) || typeof value.buster !== "string") return undefined;
  if (!isRecord(value.clientState) || !Array.isArray(value.clientState.queries)) return undefined;

  return {
    timestamp: value.timestamp as number,
    buster: value.buster,
    clientState: {
      mutations: [],
      queries: value.clientState.queries.filter(isRestorableQuery).map(sanitizePersistedQuery),
    },
  };
};

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
  let pendingClient: PersistedClient | undefined;
  let persistTimer: ReturnType<typeof setTimeout> | undefined;

  const persistNow = (client: PersistedClient) => {
    if (!storage) return;
    let candidate: PersistedClient | undefined = sanitizePersistedClient(client);
    let errorCount = 0;

    while (candidate) {
      try {
        storage.setItem(key, stringify(candidate));
        return;
      } catch (error) {
        errorCount += 1;
        candidate = removeOldestQuery({
          persistedClient: candidate,
          error: error instanceof Error ? error : new Error("Failed to persist the widget query cache"),
          errorCount,
        });
      }
    }
  };

  const clearPersistTimer = () => {
    if (persistTimer === undefined) return;
    clearTimeout(persistTimer);
    persistTimer = undefined;
  };

  const flush = () => {
    clearPersistTimer();
    const client = pendingClient;
    pendingClient = undefined;
    if (client) persistNow(client);
  };

  return {
    persistClient(client) {
      if (!storage) return;
      pendingClient = client;
      if (persistTimer !== undefined) return;
      persistTimer = setTimeout(flush, 0);
    },
    async restoreClient() {
      restoredQueries = new Map();
      try {
        const storedValue = storage?.getItem(key);
        if (!storedValue) return undefined;

        const client = sanitizeRestoredClient(parse<unknown>(storedValue));
        const age = client ? Date.now() - client.timestamp : Number.POSITIVE_INFINITY;
        if (!client || age < 0 || age > queryPersistenceMaxAgeMs || client.buster !== buster) {
          removeStorageItem(storage, key);
          return undefined;
        }

        if (client.clientState.queries.length === 0) {
          removeStorageItem(storage, key);
          return undefined;
        }

        restoredQueries = new Map(
          client.clientState.queries.map((query) => [query.queryHash, query.state.dataUpdatedAt]),
        );
        return client;
      } catch {
        removeStorageItem(storage, key);
        return undefined;
      }
    },
    removeClient() {
      clearPersistTimer();
      pendingClient = undefined;
      restoredQueries = new Map();
      removeStorageItem(storage, key);
    },
    flush,
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
    // Mark restored data stale even if its widget observer has not mounted yet.
    // TanStack still refetches only active queries; a widget that mounts after
    // this callback observes stale cached data and refreshes immediately.
    void queryClient.invalidateQueries({ type: "all", refetchType: "active", predicate });
  }, 0);
};

export const removeSessionQueryCache = (scope: string | null, storage: Storage | undefined = getSessionStorage()) => {
  removeStorageItem(storage, getQueryPersistenceStorageKey(scope));
};
