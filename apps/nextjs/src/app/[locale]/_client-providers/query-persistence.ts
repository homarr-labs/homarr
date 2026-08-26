import type { QueryKey } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { parse, stringify } from "superjson";

import { isWidgetDataQueryKey, queryCacheDefaultGcTimeMs } from "@homarr/api/query-cache";

export const queryPersistenceMaxAgeMs = queryCacheDefaultGcTimeMs;
export const queryPersistenceMaxDataBytes = 256 * 1024;
export const queryPersistenceMaxCacheBytes = 2 * 1024 * 1024;
export const queryPersistenceThrottleMs = 1_000;
export const queryPersistenceIdleTimeoutMs = 1_000;
export const queryPersistenceBuster = "v3-forbidden-filter";

const queryPersistenceStoragePrefix = "homarr:widget-query-cache";

export const getQueryPersistenceStorageKey = (scope: string | null) =>
  `${queryPersistenceStoragePrefix}:${encodeURIComponent(scope ?? "anonymous")}`;

interface PersistableQuery {
  queryKey: QueryKey;
  state: {
    data: unknown;
    dataUpdatedAt: number;
    error?: unknown;
  };
}

export type SessionQueryPersister = Persister & { flush: () => void; stop: () => void };

const textEncoder = new TextEncoder();
const budgetVerdictCache = new WeakMap<object, boolean>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

interface ForbiddenTrpcError {
  data: { code: "FORBIDDEN" };
}

const isTrpcForbiddenError = (error: unknown): error is ForbiddenTrpcError => {
  if (!isRecord(error) || !isRecord(error.data)) return false;
  return error.data.code === "FORBIDDEN";
};

const isQuotaExceededError = (error: unknown): boolean => {
  if (!isRecord(error)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
};

const measureFitsBudget = (data: unknown) => {
  try {
    return textEncoder.encode(stringify(data)).byteLength <= queryPersistenceMaxDataBytes;
  } catch {
    return false;
  }
};

const measureSerializedBytes = (data: unknown) => textEncoder.encode(stringify(data)).byteLength;

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

export const shouldPersistDashboardQuery = (query: PersistableQuery) =>
  holdsDashboardData(query) && !isTrpcForbiddenError(query.state.error) && fitsStorageBudget(query.state.data);

type DehydratedQuery = PersistedClient["clientState"]["queries"][number];

const keepNewestQueries = (client: PersistedClient, maximumQueries: number): PersistedClient | undefined => {
  if (maximumQueries <= 0) return undefined;
  if (client.clientState.queries.length <= maximumQueries) return client;

  return {
    ...client,
    clientState: {
      ...client.clientState,
      queries: client.clientState.queries
        .toSorted((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt)
        .slice(0, maximumQueries),
    },
  };
};

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
      .filter((query) => !isTrpcForbiddenError(query.state.error))
      .map(sanitizePersistedQuery),
  },
});

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
  let persistDelayTimer: ReturnType<typeof setTimeout> | undefined;
  let persistIdleCallback: number | undefined;
  let persistedQueryLimit = Number.POSITIVE_INFINITY;
  let persistenceDisabled = false;
  let stopped = false;

  const trimToQueryLimit = (client: PersistedClient): PersistedClient | undefined => {
    const limitedClient = keepNewestQueries(client, persistedQueryLimit);
    if (!limitedClient || measureSerializedBytes(limitedClient) <= queryPersistenceMaxCacheBytes) return limitedClient;

    const emptyClient: PersistedClient = {
      ...limitedClient,
      clientState: { ...limitedClient.clientState, queries: [] },
    };
    let remainingBytes = queryPersistenceMaxCacheBytes - measureSerializedBytes(emptyClient);
    const selectedQueries: DehydratedQuery[] = [];
    const newestQueries = limitedClient.clientState.queries.toSorted(
      (left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt,
    );

    for (const query of newestQueries) {
      const queryBytes = measureSerializedBytes(query) + 1;
      if (queryBytes > remainingBytes) continue;
      selectedQueries.push(query);
      remainingBytes -= queryBytes;
    }

    const buildCandidate = (queryCount: number): PersistedClient => ({
      ...limitedClient,
      clientState: { ...limitedClient.clientState, queries: selectedQueries.slice(0, queryCount) },
    });
    let minimumQueryCount = 0;
    let maximumQueryCount = selectedQueries.length;

    while (minimumQueryCount < maximumQueryCount) {
      const queryCount = Math.ceil((minimumQueryCount + maximumQueryCount) / 2);
      const candidate = buildCandidate(queryCount);
      if (measureSerializedBytes(candidate) <= queryPersistenceMaxCacheBytes) {
        minimumQueryCount = queryCount;
      } else {
        maximumQueryCount = queryCount - 1;
      }
    }

    const candidate = buildCandidate(minimumQueryCount);
    if (measureSerializedBytes(candidate) > queryPersistenceMaxCacheBytes) return undefined;
    return candidate;
  };

  const persistNow = (client: PersistedClient) => {
    if (!storage || persistenceDisabled) return;
    let candidate: PersistedClient | undefined;
    let sanitizedQueryCount = 0;
    try {
      const sanitizedClient = sanitizePersistedClient(client);
      sanitizedQueryCount = sanitizedClient.clientState.queries.length;
      candidate = trimToQueryLimit(sanitizedClient);
    } catch {
      persistenceDisabled = true;
      removeStorageItem(storage, key);
      return;
    }
    if (!candidate || candidate.clientState.queries.length === 0) {
      removeStorageItem(storage, key);
      return;
    }

    while (candidate) {
      try {
        storage.setItem(key, stringify(candidate));
        if (candidate.clientState.queries.length < sanitizedQueryCount) {
          persistedQueryLimit = Math.min(persistedQueryLimit, candidate.clientState.queries.length);
        }
        return;
      } catch (error) {
        removeStorageItem(storage, key);
        if (!isQuotaExceededError(error)) {
          persistenceDisabled = true;
          return;
        }
        candidate = keepNewestQueries(candidate, Math.floor(candidate.clientState.queries.length / 2));
      }
    }

    persistenceDisabled = true;
  };

  const clearScheduledPersist = () => {
    if (persistDelayTimer !== undefined) {
      clearTimeout(persistDelayTimer);
      persistDelayTimer = undefined;
    }
    if (persistIdleCallback !== undefined && typeof window !== "undefined") {
      window.cancelIdleCallback?.(persistIdleCallback);
      persistIdleCallback = undefined;
    }
  };

  const flush = () => {
    clearScheduledPersist();
    const client = pendingClient;
    pendingClient = undefined;
    if (client) persistNow(client);
  };

  const scheduleIdlePersist = () => {
    persistDelayTimer = undefined;
    if (typeof window !== "undefined" && window.requestIdleCallback) {
      persistIdleCallback = window.requestIdleCallback(flush, { timeout: queryPersistenceIdleTimeoutMs });
      return;
    }
    flush();
  };

  return {
    persistClient(client) {
      if (!storage || stopped || persistenceDisabled) return;
      pendingClient = client;
      if (persistDelayTimer !== undefined || persistIdleCallback !== undefined) return;
      persistDelayTimer = setTimeout(scheduleIdlePersist, queryPersistenceThrottleMs);
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
      clearScheduledPersist();
      pendingClient = undefined;
      removeStorageItem(storage, key);
    },
    flush,
    stop() {
      stopped = true;
      clearScheduledPersist();
      pendingClient = undefined;
    },
  };
};
