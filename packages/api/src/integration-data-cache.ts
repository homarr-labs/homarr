// ponytail: module-level cache is single-instance only.
// Multi-instance deployments (REDIS_IS_EXTERNAL=true) bypass this entirely —
// each request calls the upstream fetcher directly.
// isMultiInstance is read at module load; bypass behavior is verified via code review, not unit tests.
const isMultiInstance = process.env.REDIS_IS_EXTERNAL === "true";

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
  if (isMultiInstance) {
    return fetcher();
  }

  const key = cacheKey(integrationId, queryKey);
  const existing = cache.get(key) as CachedEntry<T> | undefined;
  const now = Date.now();

  if (existing) {
    if (existing.pending) {
      return existing.pending;
    }
    if (existing.timestamp > 0 && now - existing.timestamp < ttlMs) {
      return existing.data;
    }
  }

  // Set pending synchronously BEFORE creating the fetch promise to prevent
  // concurrent stale-revalidation from spawning duplicate upstream calls.
  const placeholder = existing ?? { data: undefined as T, timestamp: 0 };
  if (!existing) cache.set(key, placeholder);

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

  placeholder.pending = pending;

  return existing ? existing.data : pending;
};

export const invalidateIntegrationDataCache = (integrationId: string) => {
  for (const [key] of cache) {
    if (key.startsWith(`${integrationId}:`)) {
      cache.delete(key);
    }
  }
};
