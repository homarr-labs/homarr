interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  cacheTtlMs?: number;
  fallbackToStaleOnError?: boolean;
}

type CacheEntry<TData> = { data: TData; timestamp: Date; expiresAt: number };
type RequestResult<TData> = Pick<CacheEntry<TData>, "data" | "timestamp"> & { isStale: boolean };

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
  const inflight = new Map<string, Promise<RequestResult<TData>>>();

  return {
    invalidateCache: () => {
      cache.clear();
      inflight.clear();
    },
    handler: (input: TInput) => {
      const getDataWithProvenanceAsync = async (): Promise<RequestResult<TData>> => {
        const ttl = options.cacheTtlMs ?? DEFAULT_TTL_MS;
        const key = JSON.stringify(input);

        const cached = cache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
          return { data: cached.data, timestamp: cached.timestamp, isStale: false };
        }

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
            return { data: entry.data, timestamp: entry.timestamp, isStale: false };
          })
          .catch((err) => {
            inflight.delete(key);
            if (options.fallbackToStaleOnError && cached) {
              return { data: cached.data, timestamp: cached.timestamp, isStale: true };
            }
            throw err;
          });

        inflight.set(key, promise);
        return promise;
      };

      return {
        async getDataAsync(): Promise<Pick<RequestResult<TData>, "data" | "timestamp">> {
          const { data, timestamp } = await getDataWithProvenanceAsync();
          return { data, timestamp };
        },
        getDataWithProvenanceAsync,
      };
    },
  };
};
