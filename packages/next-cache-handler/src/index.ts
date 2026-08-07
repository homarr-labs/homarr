import type { CacheHandler } from "next/dist/server/lib/cache-handlers/types";

let handlerPromise: Promise<CacheHandler> | undefined;

const createHandlerAsync = async (): Promise<CacheHandler> => {
  const useRedis = process.env.REDIS_HOST || process.env.REDIS_IS_EXTERNAL === "true";
  if (useRedis) {
    const { RedisCacheHandler } = await import("./redis-handler");
    return new RedisCacheHandler();
  }
  const { createDefaultCacheHandler } = await import("next/dist/server/lib/cache-handlers/default");
  return createDefaultCacheHandler(32 * 1024 * 1024);
};

const getHandler = (): Promise<CacheHandler> => (handlerPromise ??= createHandlerAsync());

export default {
  get: async (...args: Parameters<CacheHandler["get"]>) => (await getHandler()).get(...args),
  set: async (...args: Parameters<CacheHandler["set"]>) => (await getHandler()).set(...args),
  refreshTags: async () => (await getHandler()).refreshTags(),
  getExpiration: async (...args: Parameters<CacheHandler["getExpiration"]>) =>
    (await getHandler()).getExpiration(...args),
  updateTags: async (...args: Parameters<CacheHandler["updateTags"]>) => (await getHandler()).updateTags(...args),
} satisfies CacheHandler;
