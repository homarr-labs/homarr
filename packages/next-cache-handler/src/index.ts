import type { CacheHandler } from "next/dist/server/lib/cache-handlers/types";

let handler: CacheHandler;

const getHandler = async (): Promise<CacheHandler> => {
  if (handler) return handler;

  const useRedis = process.env.REDIS_HOST || process.env.REDIS_IS_EXTERNAL === "true";
  if (useRedis) {
    const { RedisCacheHandler } = await import("./redis-handler");
    handler = new RedisCacheHandler();
  } else {
    const { createDefaultCacheHandler } = await import("next/dist/server/lib/cache-handlers/default");
    handler = createDefaultCacheHandler(32 * 1024 * 1024);
  }
  return handler;
};

export default {
  get: async (...args: Parameters<CacheHandler["get"]>) => (await getHandler()).get(...args),
  set: async (...args: Parameters<CacheHandler["set"]>) => (await getHandler()).set(...args),
  refreshTags: async () => (await getHandler()).refreshTags(),
  getExpiration: async (...args: Parameters<CacheHandler["getExpiration"]>) =>
    (await getHandler()).getExpiration(...args),
  updateTags: async (...args: Parameters<CacheHandler["updateTags"]>) =>
    (await getHandler()).updateTags(...args),
} satisfies CacheHandler;
