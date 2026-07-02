interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
  cacheTtlMs?: number;
}

type CacheEntry<TData> = { data: TData; timestamp: Date; expiresAt: number };

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<CacheEntry<unknown>>>();

const DEFAULT_TTL_MS = 10_000;

export const createRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => ({
  handler: (input: TInput) => ({
    async getDataAsync(): Promise<{ data: TData; timestamp: Date }> {
      const ttl = options.cacheTtlMs ?? DEFAULT_TTL_MS;
      const key = JSON.stringify(input);

      const cached = cache.get(key) as CacheEntry<TData> | undefined;
      if (cached && Date.now() < cached.expiresAt) {
        return { data: cached.data, timestamp: cached.timestamp };
      }

      const existing = inflight.get(key);
      if (existing) return existing as Promise<CacheEntry<TData>>;

      const promise = options.requestAsync(input).then((data) => {
        const entry: CacheEntry<TData> = { data, timestamp: new Date(), expiresAt: Date.now() + ttl };
        cache.set(key, entry as CacheEntry<unknown>);
        inflight.delete(key);
        return entry;
      }).catch((err) => {
        inflight.delete(key);
        throw err;
      });

      inflight.set(key, promise as Promise<CacheEntry<unknown>>);
      return promise;
    },
  }),
});
