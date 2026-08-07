interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  getCacheKey?: (input: TInput) => string;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
  staleIfErrorTtlMs?: number;
}

type CacheEntry<TData> = { data: TData; timestamp: Date; expiresAt: number; staleUntil: number };

const MAX_CACHE_SIZE = 1000;
const DEFAULT_TTL_MS = 10_000;
const DEFAULT_STALE_IF_ERROR_TTL_MS = 5 * 60_000;

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
        const key = options.getCacheKey?.(input) ?? JSON.stringify(input);

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
        promise = options
          .requestAsync(input)
          .then((data) => {
            const expiresAt = Date.now() + ttl;
            const staleIfErrorTtlMs = options.fallbackToStaleOnError
              ? Math.max(0, options.staleIfErrorTtlMs ?? DEFAULT_STALE_IF_ERROR_TTL_MS)
              : 0;
            const entry: CacheEntry<TData> = {
              data,
              timestamp: new Date(),
              expiresAt,
              staleUntil: expiresAt + staleIfErrorTtlMs,
            };
            if (ttl > 0 && generation === requestGeneration) {
              evictExpired(cache);
              if (cache.size >= MAX_CACHE_SIZE) {
                const oldest = cache.keys().next().value;
                if (oldest !== undefined) cache.delete(oldest);
              }
              cache.set(key, entry);
              scheduleExpiry(entry.staleUntil);
            }
            return entry;
          })
          .catch((err) => {
            if (
              options.fallbackToStaleOnError &&
              cached &&
              Date.now() < cached.staleUntil &&
              generation === requestGeneration
            ) {
              return cached;
            }
            throw err;
          })
          .finally(() => {
            if (inflight.get(key) === promise) inflight.delete(key);
          });

        inflight.set(key, promise);
        return promise;
      },
    }),
  };
};
