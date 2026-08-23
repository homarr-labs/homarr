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
  releaseRefreshLockAsync: (token: string) => Promise<void>;
}

const MAX_CACHE_SIZE = 1000;
const DEFAULT_TTL_MS = 10_000;
const DEFAULT_STALE_IF_ERROR_TTL_MS = 5 * 60_000;
const SHARED_REFRESH_WAIT_MS = 750;
const SHARED_REFRESH_POLL_MS = 75;

const delayAsync = async (durationMs: number) =>
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

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
        const sharedCache = ttl > 0 ? await options.getSharedCacheAsync?.(input) : undefined;
        const key = `${sharedCache?.generation ?? "local"}:${baseKey}`;

        let cached = cache.get(key);
        const now = Date.now();
        if (cached && now < cached.expiresAt) {
          return { data: cached.data, timestamp: cached.timestamp };
        }
        if (cached && now >= cached.staleUntil) {
          cache.delete(key);
          scheduleExpiry();
          cached = undefined;
        }

        const existing = inflight.get(key);
        if (existing) return existing;

        const requestGeneration = generation;
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
              const waitUntil = Date.now() + SHARED_REFRESH_WAIT_MS;
              while (Date.now() < waitUntil) {
                await delayAsync(SHARED_REFRESH_POLL_MS);
                const refreshedEntry = await sharedCache.getAsync();
                if (refreshedEntry && Date.now() < refreshedEntry.expiresAt) {
                  storeInMemory(key, refreshedEntry, requestGeneration);
                  return refreshedEntry;
                }
                if (refreshedEntry && Date.now() < refreshedEntry.staleUntil) stale = refreshedEntry;
              }

              lockToken = await sharedCache.acquireRefreshLockAsync();
              if (lockToken === null && options.fallbackToStaleOnError && stale) {
                storeInMemory(key, stale, requestGeneration);
                return stale;
              }
            }
          }

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
              if (sharedCache?.isShared) await sharedCache.setAsync(entry);
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
            if (lockToken) await sharedCache?.releaseRefreshLockAsync(lockToken);
          }
        })().finally(() => {
          if (inflight.get(key) === promise) inflight.delete(key);
        });

        inflight.set(key, promise);
        return promise;
      },
    }),
  };
};
