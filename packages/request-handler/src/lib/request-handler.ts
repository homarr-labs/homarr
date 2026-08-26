interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput, signal: AbortSignal) => Promise<TData>;
  getCacheKey?: (input: TInput) => string;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
  requestTimeoutMs?: number;
  getSharedCacheAsync?: (input: TInput, cacheIdentity: string) => Promise<SharedCacheAdapter<TData>>;
}

export interface CacheEntry<TData> {
  data: TData;
  timestamp: Date;
  expiresAt: number;
  staleUntil: number;
}

export interface SharedCacheAdapter<TData> {
  generation: string;
  isShared: boolean;
  getAsync: () => Promise<CacheEntry<TData> | null | undefined>;
  setAsync: (entry: CacheEntry<TData>, refreshLockToken: string) => Promise<boolean | void>;
  acquireRefreshLockAsync: () => Promise<string | null | undefined>;
  renewRefreshLockAsync: (token: string) => Promise<boolean | undefined>;
  releaseRefreshLockAsync: (token: string) => Promise<void>;
}

const MAX_CACHE_SIZE = 1000;
const MAX_INFLIGHT_REQUESTS = 100;
const MAX_UPSTREAM_SETTLEMENT_GRACE_MS = 60_000;
const DEFAULT_TTL_MS = 10_000;
const DEFAULT_STALE_IF_ERROR_TTL_MS = 5 * 60_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;
const SHARED_REFRESH_POLL_MS = 100;
const SHARED_REFRESH_LOCK_RETRY_MS = 1_000;
const SHARED_REFRESH_STALE_WAIT_MS = 15_000;
const SHARED_REFRESH_MAX_WAIT_MS = 30_000;
// Must remain comfortably below REFRESH_LOCK_TTL_SECONDS in shared-cache.ts.
const SHARED_REFRESH_LOCK_RENEW_MS = 5_000;

class RequestHandlerTimeoutError extends Error {
  constructor() {
    super("Request handler deadline exceeded");
    this.name = RequestHandlerTimeoutError.name;
  }
}

class RequestHandlerOverloadedError extends Error {
  constructor() {
    super("Request handler concurrency limit exceeded");
    this.name = RequestHandlerOverloadedError.name;
  }
}

const throwIfDeadlineExceeded = (deadlineAt: number) => {
  if (Date.now() >= deadlineAt) throw new RequestHandlerTimeoutError();
};

const delayAsync = async (durationMs: number, deadlineAt: number) => {
  throwIfDeadlineExceeded(deadlineAt);
  const remainingMs = deadlineAt - Date.now();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, Math.min(durationMs, remainingMs));
    timer.unref?.();
  });
  throwIfDeadlineExceeded(deadlineAt);
};

const waitForSettlementGraceAsync = async (settledAsync: Promise<void>, durationMs: number) => {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, durationMs);
    timer.unref?.();
    void settledAsync.then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
};

const startRefreshLockRenewal = <TData>(sharedCache: SharedCacheAdapter<TData>, token: string) => {
  let isOwned = true;
  let isStopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    timer = setTimeout(() => {
      void sharedCache.renewRefreshLockAsync(token).then(
        (renewed) => {
          if (renewed !== true) {
            isOwned = false;
            return;
          }
          if (!isStopped) schedule();
        },
        () => {
          isOwned = false;
        },
      );
    }, SHARED_REFRESH_LOCK_RENEW_MS);
    timer.unref?.();
  };

  schedule();
  return {
    isOwned: () => isOwned,
    stop: () => {
      isStopped = true;
      if (timer) clearTimeout(timer);
    },
  };
};

const evictExpired = <TData>(cache: Map<string, CacheEntry<TData>>) => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now >= entry.staleUntil) cache.delete(key);
  }
};

export const createRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  const requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error("Request timeout must be a positive finite duration");
  }

  const cache = new Map<string, CacheEntry<TData>>();
  const inflight = new Map<string, Promise<CacheEntry<TData>>>();
  const sharedCacheResolutions = new Map<string, Promise<SharedCacheAdapter<TData>>>();
  const upstreamSettlements = new Map<string, Promise<void>>();
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimerAt: number | undefined;
  let generation = 0;

  const storeInMemory = (key: string, entry: CacheEntry<TData>, requestGeneration: number) => {
    if (generation !== requestGeneration || Date.now() >= entry.staleUntil) return;
    evictExpired(cache);
    cache.delete(key);
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, entry);
    scheduleExpiry(entry.staleUntil);
  };

  const getFromMemory = (key: string) => {
    const entry = cache.get(key);
    if (!entry) return undefined;
    cache.delete(key);
    cache.set(key, entry);
    return entry;
  };

  const startRequestWithDeadline = (input: TInput, deadlineAt: number, upstreamKey: string) => {
    throwIfDeadlineExceeded(deadlineAt);
    if (upstreamSettlements.has(upstreamKey) || upstreamSettlements.size >= MAX_INFLIGHT_REQUESTS) {
      throw new RequestHandlerOverloadedError();
    }

    const controller = new AbortController();
    const timeoutError = new RequestHandlerTimeoutError();
    const remainingMs = deadlineAt - Date.now();
    let upstreamRequest: Promise<TData>;
    try {
      upstreamRequest = Promise.resolve(options.requestAsync(input, controller.signal));
    } catch (error) {
      upstreamRequest = Promise.reject(error);
    }
    const settledAsync = upstreamRequest.then(
      () => undefined,
      () => undefined,
    );
    upstreamSettlements.set(upstreamKey, settledAsync);
    void settledAsync.then(() => {
      if (upstreamSettlements.get(upstreamKey) === settledAsync) upstreamSettlements.delete(upstreamKey);
    });

    const resultAsync = new Promise<TData>((resolve, reject) => {
      const timer = setTimeout(() => {
        controller.abort(timeoutError);
        reject(timeoutError);
      }, remainingMs);
      timer.unref?.();

      void upstreamRequest.then(resolve, reject).finally(() => clearTimeout(timer));
    });

    return { resultAsync, settledAsync };
  };

  const resolveSharedCacheAsync = (input: TInput, cacheIdentity: string, requestGeneration: number) => {
    if (!options.getSharedCacheAsync) return undefined;

    const resolutionKey = `${requestGeneration}:${cacheIdentity}`;
    const existing = sharedCacheResolutions.get(resolutionKey);
    if (existing) return existing;
    if (sharedCacheResolutions.size >= MAX_INFLIGHT_REQUESTS) {
      throw new RequestHandlerOverloadedError();
    }

    let promise: Promise<SharedCacheAdapter<TData>>;
    promise = options.getSharedCacheAsync(input, cacheIdentity).finally(() => {
      if (sharedCacheResolutions.get(resolutionKey) === promise) sharedCacheResolutions.delete(resolutionKey);
    });
    sharedCacheResolutions.set(resolutionKey, promise);
    return promise;
  };

  const scheduleExpiry = (candidateExpiryAt?: number) => {
    if (candidateExpiryAt !== undefined && expiryTimerAt !== undefined && expiryTimerAt <= candidateExpiryAt) return;
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = undefined;
    expiryTimerAt = undefined;
    if (cache.size === 0) return;

    const nextExpiryAt = candidateExpiryAt ?? Math.min(...[...cache.values()].map(({ staleUntil }) => staleUntil));
    expiryTimerAt = nextExpiryAt;
    expiryTimer = setTimeout(
      () => {
        expiryTimer = undefined;
        expiryTimerAt = undefined;
        evictExpired(cache);
        scheduleExpiry();
      },
      Math.max(0, nextExpiryAt - Date.now()),
    );
    expiryTimer.unref?.();
  };

  return {
    invalidateCache: () => {
      generation += 1;
      cache.clear();
      if (expiryTimer) clearTimeout(expiryTimer);
      expiryTimer = undefined;
      expiryTimerAt = undefined;
    },
    handler: (input: TInput) => ({
      async getDataAsync(): Promise<{ data: TData; timestamp: Date }> {
        const deadlineAt = Date.now() + requestTimeoutMs;
        const ttl = options.cacheTtlMs ?? DEFAULT_TTL_MS;
        const baseKey = options.getCacheKey?.(input) ?? JSON.stringify(input);
        const requestGeneration = generation;
        let sharedCache: SharedCacheAdapter<TData> | undefined;
        const sharedCacheResolution = ttl > 0 ? resolveSharedCacheAsync(input, baseKey, requestGeneration) : undefined;
        if (sharedCacheResolution) {
          sharedCache = await sharedCacheResolution;
          throwIfDeadlineExceeded(deadlineAt);
        }

        const key = `${sharedCache?.generation ?? "local"}:${baseKey}`;
        const inflightKey = `${requestGeneration}:${key}`;
        const existing = inflight.get(inflightKey);
        if (existing) return existing;

        let cached = getFromMemory(key);
        const now = Date.now();
        if (cached && now < cached.expiresAt) return cached;
        if (cached && now >= cached.staleUntil) {
          cache.delete(key);
          scheduleExpiry();
          cached = undefined;
        }
        if (upstreamSettlements.has(inflightKey) || inflight.size >= MAX_INFLIGHT_REQUESTS) {
          if (options.fallbackToStaleOnError && cached) return cached;
          throw new RequestHandlerOverloadedError();
        }

        let cleanupAfterUpstreamAsync: Promise<void> | undefined;
        let promise: Promise<CacheEntry<TData>>;
        promise = (async () => {
          let stale = cached;
          let lockToken: string | null | undefined;

          if (sharedCache?.isShared) {
            const sharedEntry = await sharedCache.getAsync();
            if (sharedEntry && Date.now() < sharedEntry.expiresAt) {
              storeInMemory(key, sharedEntry, requestGeneration);
              return sharedEntry;
            }
            if (sharedEntry && Date.now() < sharedEntry.staleUntil) stale = sharedEntry;

            lockToken = await sharedCache.acquireRefreshLockAsync();
            if (lockToken === null) {
              const returnStaleAt = Date.now() + SHARED_REFRESH_STALE_WAIT_MS;
              const waitDeadlineAt = Math.min(deadlineAt, Date.now() + SHARED_REFRESH_MAX_WAIT_MS);
              let retryLockAt = Date.now() + SHARED_REFRESH_LOCK_RETRY_MS;
              while (lockToken === null && sharedCache.isShared) {
                await delayAsync(SHARED_REFRESH_POLL_MS, waitDeadlineAt);
                const refreshedEntry = await sharedCache.getAsync();
                if (refreshedEntry && Date.now() < refreshedEntry.expiresAt) {
                  storeInMemory(key, refreshedEntry, requestGeneration);
                  return refreshedEntry;
                }
                if (refreshedEntry && Date.now() < refreshedEntry.staleUntil) stale = refreshedEntry;
                if (Date.now() >= returnStaleAt && options.fallbackToStaleOnError && stale) {
                  storeInMemory(key, stale, requestGeneration);
                  return stale;
                }
                if (Date.now() >= retryLockAt) {
                  lockToken = await sharedCache.acquireRefreshLockAsync();
                  retryLockAt = Date.now() + SHARED_REFRESH_LOCK_RETRY_MS;
                }
              }
            }
          }

          const refreshLockRenewal =
            lockToken && sharedCache ? startRefreshLockRenewal(sharedCache, lockToken) : undefined;
          let upstreamSettledAsync: Promise<void> | undefined;
          try {
            const request = startRequestWithDeadline(input, deadlineAt, inflightKey);
            upstreamSettledAsync = request.settledAsync;
            const data = await request.resultAsync;
            const completedAt = Date.now();
            const staleIfErrorTtlMs = options.fallbackToStaleOnError
              ? Math.max(0, options.staleIfErrorTtlMs ?? DEFAULT_STALE_IF_ERROR_TTL_MS)
              : 0;
            const entry: CacheEntry<TData> = {
              data,
              timestamp: new Date(completedAt),
              expiresAt: completedAt + ttl,
              staleUntil: completedAt + ttl + staleIfErrorTtlMs,
            };
            if (ttl > 0) {
              let canStoreInMemory = true;
              if (sharedCache?.isShared) {
                canStoreInMemory = false;
                if (lockToken && refreshLockRenewal?.isOwned() !== false) {
                  const stored = await sharedCache.setAsync(entry, lockToken);
                  if (stored !== false || !sharedCache.isShared) canStoreInMemory = true;
                }
              }
              if (canStoreInMemory) storeInMemory(key, entry, requestGeneration);
            }
            return entry;
          } catch (error) {
            if (
              options.fallbackToStaleOnError &&
              stale &&
              Date.now() < stale.staleUntil &&
              generation === requestGeneration
            ) {
              storeInMemory(key, stale, requestGeneration);
              return stale;
            }
            throw error;
          } finally {
            const cleanupAsync = async () => {
              refreshLockRenewal?.stop();
              if (lockToken) await sharedCache?.releaseRefreshLockAsync(lockToken);
            };
            if (upstreamSettledAsync) {
              const settlementGraceMs = Math.min(requestTimeoutMs, MAX_UPSTREAM_SETTLEMENT_GRACE_MS);
              cleanupAfterUpstreamAsync = waitForSettlementGraceAsync(upstreamSettledAsync, settlementGraceMs).then(
                cleanupAsync,
              );
            } else {
              await cleanupAsync();
            }
          }
        })();

        inflight.set(inflightKey, promise);
        const removeInflight = () => {
          const cleanupAsync = cleanupAfterUpstreamAsync ?? Promise.resolve();
          void cleanupAsync.then(
            () => {
              if (inflight.get(inflightKey) === promise) inflight.delete(inflightKey);
            },
            () => {
              if (inflight.get(inflightKey) === promise) inflight.delete(inflightKey);
            },
          );
        };
        void promise.then(removeInflight, removeInflight);
        return promise;
      },
    }),
  };
};
