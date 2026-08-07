// ponytail: module-level cache — one snapshot per integration per query key.
// Ceiling: stale data for up to `ttlMs` (60s default). Upgrade: Redis-backed with pub/sub invalidation.

interface CachedEntry<T> {
  data: T;
  timestamp: number;
  pending?: Promise<T>;
}

const cache = new Map<string, CachedEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000;
const MAX_ENTRIES = 200;

const cacheKey = (integrationId: string, queryKey: string) => `${integrationId}:${queryKey}`;

export const getCachedIntegrationData = async <T>(
  integrationId: string,
  queryKey: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> => {
  const key = cacheKey(integrationId, queryKey);
  const existing = cache.get(key) as CachedEntry<T> | undefined;
  const now = Date.now();

  if (existing) {
    if (now - existing.timestamp < ttlMs) {
      return existing.data;
    }
    if (existing.pending) {
      return existing.pending;
    }
  }

  const pending = fetcher()
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now() });

      if (cache.size > MAX_ENTRIES) {
        let oldest: string | undefined;
        let oldestTime = Infinity;
        for (const [k, v] of cache) {
          if (v.timestamp < oldestTime) {
            oldestTime = v.timestamp;
            oldest = k;
          }
        }
        if (oldest) cache.delete(oldest);
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

  if (existing) {
    existing.pending = pending;
    return existing.data;
  }

  cache.set(key, { data: undefined as T, timestamp: 0, pending });
  return pending;
};

export const invalidateIntegrationDataCache = (integrationId: string) => {
  for (const [key] of cache) {
    if (key.startsWith(`${integrationId}:`)) {
      cache.delete(key);
    }
  }
};
