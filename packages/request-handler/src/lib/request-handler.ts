interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  cacheTtlMs?: number;
}

type CacheEntry<TData> = { data: TData; timestamp: Date; expiresAt: number };

const MAX_CACHE_SIZE = 1000;
const DEFAULT_TTL_MS = 10_000;

const evictExpired = <TData>(cache: Map<string, CacheEntry<TData>>) => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now >= entry.expiresAt) cache.delete(key);
  }
};

export const createRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => {
  const cache = new Map<string, CacheEntry<TData>>();
  const inflight = new Map<string, Promise<CacheEntry<TData>>>();

  return {
    invalidateCache: () => {
      cache.clear();
      inflight.clear();
    },
    handler: (input: TInput) => ({
      async getDataAsync(): Promise<{ data: TData; timestamp: Date }> {
        const ttl = options.cacheTtlMs ?? DEFAULT_TTL_MS;
        const key = JSON.stringify(input);

        const cached = cache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
          return { data: cached.data, timestamp: cached.timestamp };
        }
        if (cached) cache.delete(key);

        const existing = inflight.get(key);
        if (existing) return existing;

        const promise = options
          .requestAsync(input)
          .then((data) => {
            if (cache.size >= MAX_CACHE_SIZE) evictExpired(cache);
            if (cache.size >= MAX_CACHE_SIZE) {
              const oldest = cache.keys().next().value;
              if (oldest) cache.delete(oldest);
            }
            const entry: CacheEntry<TData> = { data, timestamp: new Date(), expiresAt: Date.now() + ttl };
            cache.set(key, entry);
            inflight.delete(key);
            return entry;
          })
          .catch((err) => {
            inflight.delete(key);
            throw err;
          });

        inflight.set(key, promise);
        return promise;
      },
    }),
  };
};
