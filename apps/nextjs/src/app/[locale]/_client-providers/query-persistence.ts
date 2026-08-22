import type { QueryKey } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { removeOldestQuery } from "@tanstack/react-query-persist-client";
import { parse, stringify } from "superjson";

import { isWidgetDataQueryKey, queryCacheDefaultGcTimeMs } from "@homarr/api/query-cache";

export const queryPersistenceMaxAgeMs = queryCacheDefaultGcTimeMs;
export const queryPersistenceMaxDataBytes = 256 * 1024;
export const queryPersistenceBuster = "v2-session-superjson";

const queryPersistenceStoragePrefix = "homarr:widget-query-cache";

export const getQueryPersistenceStorageKey = (scope: string | null) =>
  `${queryPersistenceStoragePrefix}:${encodeURIComponent(scope ?? "anonymous")}`;

interface PersistableQuery {
  queryKey: QueryKey;
  state: {
    data: unknown;
    dataUpdatedAt: number;
  };
}

export type SessionQueryPersister = Persister & { flush: () => void };

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
    isInvalidated: true,
    status: "success",
  },
});

const sanitizePersistedClient = (client: PersistedClient): PersistedClient => ({
  ...client,
  clientState: {
    mutations: [],
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
  } catch {}
};

export const createSessionQueryPersister = (
  scope: string | null,
  storage: Storage | undefined = getSessionStorage(),
): SessionQueryPersister => {
  const key = getQueryPersistenceStorageKey(scope);
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
    restoreClient() {
      try {
        const storedValue = storage?.getItem(key);
        if (!storedValue) return undefined;

        const client = sanitizeRestoredClient(parse<unknown>(storedValue));
        if (!client || client.timestamp > Date.now()) {
          removeStorageItem(storage, key);
          return undefined;
        }

        if (client.clientState.queries.length === 0) {
          removeStorageItem(storage, key);
          return undefined;
        }

        return client;
      } catch {
        removeStorageItem(storage, key);
        return undefined;
      }
    },
    removeClient() {
      clearPersistTimer();
      pendingClient = undefined;
      removeStorageItem(storage, key);
    },
    flush,
  };
};
