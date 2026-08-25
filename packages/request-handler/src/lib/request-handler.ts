interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  getCacheKey?: (input: TInput) => string;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
  getSharedCacheAsync?: (input: TInput) => Promise<SharedCacheAdapter<TData>>;
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
  setAsync: (entry: CacheEntry<TData>) => Promise<void>;
  acquireRefreshLockAsync: () => Promise<string | null | undefined>;
  renewRefreshLockAsync: (token: string) => Promise<boolean | undefined>;
  releaseRefreshLockAsync: (token: string) => Promise<void>;
}

const MAX_CACHE_SIZE = 1000;
const DEFAULT_TTL_MS = 10_000;
const DEFAULT_STALE_IF_ERROR_TTL_MS = 5 * 60_000;
const SHARED_REFRESH_POLL_MS = 100;
const SHARED_REFRESH_LOCK_RETRY_MS = 1_000;
const SHARED_REFRESH_STALE_WAIT_MS = 15_000;
// Must remain comfortably below REFRESH_LOCK_TTL_SECONDS in shared-cache.ts.
const SHARED_REFRESH_LOCK_RENEW_MS = 5_000;

const delayAsync = async (durationMs: number) =>
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

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
  const cache = new Map<string, CacheEntry<TData>>();
  const inflight = new Map<string, Promise<CacheEntry<TData>>>();
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimerAt: number | undefined;
  let generation = 0;

  const storeInMemory = (key: string, entry: CacheEntry<TData>, requestGeneration: number) => {
    if (generation !== requestGeneration || Date.now() >= entry.staleUntil) return;
    evictExpired(cache);
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, entry);
    scheduleExpiry(entry.staleUntil);
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
      inflight.clear();
      if (expiryTimer) clearTimeout(expiryTimer);
      expiryTimer = undefined;
      expiryTimerAt = undefined;
    },
    handler: (input: TInput) => ({
      async getDataAsync(): Promise<{ data: TData; timestamp: Date }> {
        const ttl = options.cacheTtlMs ?? DEFAULT_TTL_MS;
        const baseKey = options.getCacheKey?.(input) ?? JSON.stringify(input);
        const existing = inflight.get(baseKey);
        if (existing) return existing;

        const requestGeneration = generation;
        let promise: Promise<CacheEntry<TData>>;
        promise = (async () => {
          let sharedCache: SharedCacheAdapter<TData> | undefined;
          if (ttl > 0 && options.getSharedCacheAsync) {
            sharedCache = await options.getSharedCacheAsync(input);
          }
          const key = `${sharedCache?.generation ?? "local"}:${baseKey}`;

          let cached = cache.get(key);
          const now = Date.now();
          if (cached && now < cached.expiresAt) return cached;
          if (cached && now >= cached.staleUntil) {
            cache.delete(key);
            scheduleExpiry();
            cached = undefined;
          }

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
              let retryLockAt = Date.now() + SHARED_REFRESH_LOCK_RETRY_MS;
              while (lockToken === null && sharedCache.isShared) {
                await delayAsync(SHARED_REFRESH_POLL_MS);
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
          try {
            const data = await options.requestAsync(input);
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
              storeInMemory(key, entry, requestGeneration);
              if (sharedCache?.isShared && refreshLockRenewal?.isOwned() !== false) {
                await sharedCache.setAsync(entry);
              }
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
            refreshLockRenewal?.stop();
            if (lockToken) await sharedCache?.releaseRefreshLockAsync(lockToken);
          }
        })().finally(() => {
          if (inflight.get(baseKey) === promise) inflight.delete(baseKey);
        });

        inflight.set(baseKey, promise);
        return promise;
      },
    }),
  };
};
