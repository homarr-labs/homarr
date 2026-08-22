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

export type SessionQueryPersister = Persister & { flush: () => void; stop: () => void };

const textEncoder = new TextEncoder();
// React Query re-dehydrates the whole cache on every cache event, so this
// predicate runs for every query several times per refresh cycle. Measuring a
// payload means serializing it, which dwarfs everything else in the pass, so
// remember the verdict per data reference instead of re-encoding every widget
// payload every time.
const budgetVerdictCache = new WeakMap<object, boolean>();

const measureFitsBudget = (data: unknown) => {
  try {
    return textEncoder.encode(stringify(data)).byteLength <= queryPersistenceMaxDataBytes;
  } catch {
    return false;
  }
};

const fitsStorageBudget = (data: unknown) => {
  if (typeof data !== "object" || data === null) return measureFitsBudget(data);

  const cached = budgetVerdictCache.get(data);
  if (cached !== undefined) return cached;

  const verdict = measureFitsBudget(data);
  budgetVerdictCache.set(data, verdict);
  return verdict;
};

const holdsDashboardData = (query: PersistableQuery) =>
  query.state.data !== undefined &&
  Number.isFinite(query.state.dataUpdatedAt) &&
  query.state.dataUpdatedAt > 0 &&
  isWidgetDataQueryKey(query.queryKey);

/** Write path: dashboard data that is small enough to keep in session storage. */
export const shouldPersistDashboardQuery = (query: PersistableQuery) =>
  holdsDashboardData(query) && fitsStorageBudget(query.state.data);

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

// Read path: the payload was already budgeted when it was written, and this runs
// before any query is allowed to fetch, so it deliberately skips the expensive
// size measurement and only rejects anything that is not restorable widget data.
const isRestorableQuery = (value: unknown): value is DehydratedQuery => {
  if (!isRecord(value) || typeof value.queryHash !== "string" || !Array.isArray(value.queryKey)) return false;
  if (!isRecord(value.state) || typeof value.state.status !== "string") return false;

  return holdsDashboardData(value as unknown as PersistableQuery);
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
    return undefined;
  }
};

// Signing out navigates away before the session scope guard can observe the
// change, so a previous account's cached dashboard data would otherwise linger
// in the tab. Only the active scope may keep a cache.
const removeForeignScopes = (storage: Storage | undefined, activeKey: string) => {
  if (!storage) return;

  try {
    const foreignKeys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const storedKey = storage.key(index);
      if (storedKey === null || storedKey === activeKey) continue;
      if (storedKey.startsWith(`${queryPersistenceStoragePrefix}:`)) foreignKeys.push(storedKey);
    }

    for (const foreignKey of foreignKeys) storage.removeItem(foreignKey);
  } catch {
    return undefined;
  }
};

export const createSessionQueryPersister = (
  scope: string | null,
  storage: Storage | undefined = getSessionStorage(),
): SessionQueryPersister => {
  const key = getQueryPersistenceStorageKey(scope);
  removeForeignScopes(storage, key);
  let pendingClient: PersistedClient | undefined;
  let persistTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const persistNow = (client: PersistedClient) => {
    if (!storage) return;
    let candidate: PersistedClient | undefined = sanitizePersistedClient(client);
    let errorCount = 0;

    if (candidate.clientState.queries.length === 0) {
      removeStorageItem(storage, key);
      return;
    }

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
      if (!storage || stopped) return;
      pendingClient = client;
      if (persistTimer !== undefined) return;
      persistTimer = setTimeout(flush, 0);
    },
    restoreClient() {
      try {
        const storedValue = storage?.getItem(key);
        if (!storedValue) return undefined;

        const client = sanitizeRestoredClient(parse<unknown>(storedValue));
        if (!client || client.timestamp > Date.now() || client.clientState.queries.length === 0) {
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
    // Called when the provider tears down, after the last flush: the teardown
    // also clears the query cache, and that clear must not be able to overwrite
    // the snapshot we just saved with an empty one.
    stop() {
      stopped = true;
      clearPersistTimer();
      pendingClient = undefined;
    },
  };
};
