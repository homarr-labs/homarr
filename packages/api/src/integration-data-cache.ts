const isMultiInstance = process.env.REDIS_IS_EXTERNAL === "true";

interface CachedEntry<T> {
  data: T;
  timestamp: number;
  pending?: Promise<T>;
}

const cache = new Map<string, CachedEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 200;

export const getCachedIntegrationData = async <T>(
  integrationId: string,
  queryKey: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> => {
  if (isMultiInstance) {
    return fetcher();
  }

  const key = `${integrationId}:${queryKey}`;
  const existing = cache.get(key) as CachedEntry<T> | undefined;
  const now = Date.now();

  if (existing?.pending) return existing.timestamp > 0 ? existing.data : existing.pending;
  if (existing && existing.timestamp > 0 && now - existing.timestamp < ttlMs) {
    return existing.data;
  }

  // Set pending synchronously BEFORE creating the fetch promise to prevent
  // concurrent stale-revalidation from spawning duplicate upstream calls.
  const placeholder = existing ?? { data: undefined as T, timestamp: 0 };
  if (!existing) cache.set(key, placeholder);

  const pending = fetcher()
    .then((data) => {
      if (cache.get(key) === placeholder) {
        cache.set(key, { data, timestamp: Date.now() });
        if (cache.size > MAX_ENTRIES) {
          let oldestKey: string | undefined;
          let oldestTime = Infinity;
          for (const [k, e] of cache) {
            if (e.timestamp < oldestTime) {
              oldestTime = e.timestamp;
              oldestKey = k;
            }
          }
          if (oldestKey) cache.delete(oldestKey);
        }
      }
      return data;
    })
    .catch((error) => {
      const entry = cache.get(key) as CachedEntry<T> | undefined;
      if (entry) {
        delete entry.pending;
        if (entry.timestamp > 0) return entry.data;
      }
      cache.delete(key);
      throw error;
    });

  placeholder.pending = pending;

  return existing ? existing.data : pending;
};

export const invalidateIntegrationDataCache = (integrationId: string) => {
  const prefix = `${integrationId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};
