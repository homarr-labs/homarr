import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import type { CustomWidgetHttpRequest, CustomWidgetHttpResponse } from "@homarr/custom-widgets/server";

const ENTRY_PREFIX = "custom-widget:response-cache:v2:entry:";
const GENERATION_PREFIX = "custom-widget:response-cache:v2:generation:";
const LRU_KEY = "custom-widget:response-cache:v2:lru";
const SIZE_KEY = "custom-widget:response-cache:v2:sizes";
const TOTAL_BYTES_KEY = "custom-widget:response-cache:v2:bytes";
// Outlive the one-hour response TTL and 45-second request deadline so a
// generation cannot reset while an entry from the previous one is reachable.
const GENERATION_RETENTION_SECONDS = 2 * 60 * 60;
const MAX_ENTRIES = 1_000;
const MAX_BYTES = 64 * 1024 * 1024;

const INVALIDATE_GENERATIONS_SCRIPT = `
for _, key in ipairs(KEYS) do
  redis.call('INCR', key)
  redis.call('EXPIRE', key, ARGV[1])
end
return #KEYS
`;

const STORE_SCRIPT = `
local previousSize = tonumber(redis.call('HGET', KEYS[2], ARGV[1]) or '0')
if previousSize > 0 then redis.call('DECRBY', KEYS[3], previousSize) end
redis.call('SET', ARGV[1], ARGV[2], 'PX', ARGV[3])
redis.call('ZADD', KEYS[1], ARGV[4], ARGV[1])
redis.call('HSET', KEYS[2], ARGV[1], ARGV[5])
local totalBytes = redis.call('INCRBY', KEYS[3], ARGV[5])
while redis.call('ZCARD', KEYS[1]) > tonumber(ARGV[6]) or totalBytes > tonumber(ARGV[7]) do
  local evicted = redis.call('ZPOPMIN', KEYS[1], 1)
  if #evicted == 0 then break end
  local evictedKey = evicted[1]
  local evictedSize = tonumber(redis.call('HGET', KEYS[2], evictedKey) or '0')
  redis.call('DEL', evictedKey)
  redis.call('HDEL', KEYS[2], evictedKey)
  if evictedSize > 0 then totalBytes = redis.call('DECRBY', KEYS[3], evictedSize) end
end
return totalBytes
`;

const logger = createLogger({ module: "custom-widget:response-cache" });
const inFlight = new Map<string, { cacheKey: string; request: Promise<CustomWidgetHttpResponse> }>();
let redis: RedisClient | undefined;

const useSharedCache = () => process.env.NODE_ENV !== "test";

const getRedis = () => {
  redis ??= createRedisClient();
  return redis;
};

const getGenerationKey = (prefix: string) => `${GENERATION_PREFIX}${createHash("sha256").update(prefix).digest("hex")}`;

const getCacheKeyPrefixes = (cacheKey: string) => {
  const prefixes: string[] = [];
  let separatorIndex = cacheKey.indexOf(":");
  while (separatorIndex >= 0) {
    prefixes.push(cacheKey.slice(0, separatorIndex + 1));
    separatorIndex = cacheKey.indexOf(":", separatorIndex + 1);
  }
  prefixes.push(cacheKey);
  return prefixes;
};

const getGeneration = async (client: RedisClient, cacheKey: string) => {
  const keys = getCacheKeyPrefixes(cacheKey).map(getGenerationKey);
  const generations = await client.mget(...keys);
  return generations.map((generation) => generation ?? "0").join(":");
};

const getEntryKey = (generation: string, cacheKey: string) => {
  const digest = createHash("sha256").update(cacheKey).digest("hex");
  return `${ENTRY_PREFIX}${generation}:${digest}`;
};

const readCachedResponse = async (client: RedisClient, entryKey: string) => {
  const serialized = await client.get(entryKey);
  if (serialized === null) return undefined;
  await client.zadd(LRU_KEY, Date.now(), entryKey);
  try {
    return JSON.parse(serialized) as CustomWidgetHttpResponse;
  } catch {
    await client.del(entryKey);
    return undefined;
  }
};

const storeCachedResponse = async (
  client: RedisClient,
  entryKey: string,
  response: CustomWidgetHttpResponse,
  ttlSeconds: number,
) => {
  const serialized = JSON.stringify(response);
  const size = Buffer.byteLength(serialized, "utf8");
  await client.eval(
    STORE_SCRIPT,
    3,
    LRU_KEY,
    SIZE_KEY,
    TOTAL_BYTES_KEY,
    entryKey,
    serialized,
    ttlSeconds * 1_000,
    Date.now(),
    size,
    MAX_ENTRIES,
    MAX_BYTES,
  );
};

export async function executeWithCustomWidgetResponseCache(
  input: CustomWidgetHttpRequest,
  execute: (input: CustomWidgetHttpRequest) => Promise<CustomWidgetHttpResponse>,
): Promise<CustomWidgetHttpResponse> {
  const cacheKey = input.kind === "query" ? input.cacheKey : undefined;
  if (!cacheKey) return execute(input);
  if (!useSharedCache()) return execute(input);

  let client: RedisClient;
  let generation: string;
  try {
    client = getRedis();
    generation = await getGeneration(client, cacheKey);
    if ((input.cacheTtlSeconds ?? 0) > 0) {
      const cached = await readCachedResponse(client, getEntryKey(generation, cacheKey));
      if (cached) return cached;
    }
  } catch (error) {
    logger.error("Shared custom widget response cache is unavailable", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return execute({ ...input, cacheKey: undefined });
  }

  const pendingKey = `${generation}:${cacheKey}`;
  const pending = inFlight.get(pendingKey);
  if (pending) return pending.request;

  let request: Promise<CustomWidgetHttpResponse>;
  request = execute({ ...input, cacheKey: undefined })
    .then(async (response) => {
      const ttlSeconds = input.cacheTtlSeconds ?? 0;
      if (!response.ok || ttlSeconds <= 0) return response;
      try {
        const currentGeneration = await getGeneration(client, cacheKey);
        if (currentGeneration === generation) {
          await storeCachedResponse(client, getEntryKey(generation, cacheKey), response, ttlSeconds);
        }
      } catch (error) {
        logger.error("Failed to store a custom widget response", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
      return response;
    })
    .finally(() => {
      if (inFlight.get(pendingKey)?.request === request) inFlight.delete(pendingKey);
    });
  inFlight.set(pendingKey, { cacheKey, request });
  return request;
}

export async function invalidateSharedCustomWidgetResponseCache(prefixes: readonly string[]) {
  if (prefixes.length === 0 || !useSharedCache()) return;
  const uniquePrefixes = [...new Set(prefixes)];
  for (const [key, pending] of inFlight) {
    if (uniquePrefixes.some((prefix) => pending.cacheKey.startsWith(prefix))) inFlight.delete(key);
  }
  try {
    const keys = uniquePrefixes.map(getGenerationKey);
    await getRedis().eval(INVALIDATE_GENERATIONS_SCRIPT, keys.length, ...keys, GENERATION_RETENTION_SECONDS);
  } catch (error) {
    logger.error("Failed to invalidate the shared custom widget response cache", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
