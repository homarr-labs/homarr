import { createHash } from "node:crypto";

import { TRPCError } from "@trpc/server";

import { FlattenError } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";

const logger = createLogger({ module: "custom-widget:limits" });
const WINDOW_MS = 60_000;
const CONCURRENCY_TTL_MS = 30_000;

const categoryLimits = {
  query: 60,
  action: 10,
  delete: 3,
} as const;

type RequestCategory = keyof typeof categoryLimits;

export interface RequestLimitInput {
  category: RequestCategory;
  userId?: string;
  itemId: string;
  definitionId: string;
}

class RequestLimitError extends FlattenError {
  constructor(message: string, retryAfterMs: number) {
    super(message, { retryAfterMs });
  }
}

let redisClient: RedisClient | null | undefined;
const getRedisClient = () => {
  if (process.env.CI !== undefined || process.env.NODE_ENV === "test") return null;
  redisClient ??= createRedisClient();
  return redisClient;
};

const hashKey = (...parts: string[]) => createHash("sha256").update(parts.join("\0")).digest("hex");

const rateScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('PTTL', KEYS[1]) }
`;

const concurrencyScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
if count > tonumber(ARGV[1]) then
  redis.call('DECR', KEYS[1])
  return 0
end
return count
`;

const releaseConcurrencyScript = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count <= 1 then
  redis.call('DEL', KEYS[1])
  return 0
end
return redis.call('DECR', KEYS[1])
`;

const localRateBuckets = new Map<string, number[]>();
const localConcurrency = new Map<string, number>();

const throwLimitExceeded = (retryAfterMs: number): never => {
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: "Custom widget request limit exceeded",
    cause: new RequestLimitError("Custom widget request limit exceeded", Math.max(1, retryAfterMs)),
  });
};

const enforceLocalRateLimit = (key: string, limit: number) => {
  const now = Date.now();
  const recent = (localRateBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= limit) {
    throwLimitExceeded(WINDOW_MS - (now - (recent[0] ?? now)));
  }
  recent.push(now);
  localRateBuckets.set(key, recent);
};

const acquireLocalConcurrency = (key: string, limit: number) => {
  const current = localConcurrency.get(key) ?? 0;
  if (current >= limit) throwLimitExceeded(1_000);
  localConcurrency.set(key, current + 1);
};

const releaseLocalConcurrency = (key: string) => {
  const current = localConcurrency.get(key) ?? 0;
  if (current <= 1) localConcurrency.delete(key);
  else localConcurrency.set(key, current - 1);
};

const enforceRedisRateLimit = async (redis: RedisClient, key: string, limit: number) => {
  const result = (await redis.eval(rateScript, 1, key, WINDOW_MS)) as [number, number];
  const [count, ttl] = result.map(Number) as [number, number];
  if (count > limit) throwLimitExceeded(ttl > 0 ? ttl : WINDOW_MS);
};

const acquireRedisConcurrency = async (redis: RedisClient, key: string, limit: number) => {
  const count = Number(await redis.eval(concurrencyScript, 1, key, limit, CONCURRENCY_TTL_MS));
  if (count === 0) throwLimitExceeded(1_000);
};

const releaseRedisConcurrency = async (redis: RedisClient, key: string) => {
  await redis.eval(releaseConcurrencyScript, 1, key);
};

export const acquireCustomWidgetRequestLimit = async (input: RequestLimitInput): Promise<() => Promise<void>> => {
  const identity = input.userId ?? "anonymous";
  const rateKey = `custom-widget:rate:${input.category}:${hashKey(identity, input.itemId)}`;
  const userConcurrencyKey = `custom-widget:concurrency:user-item:${hashKey(identity, input.itemId)}`;
  const definitionConcurrencyKey = `custom-widget:concurrency:definition:${hashKey(input.definitionId)}`;
  const redis = getRedisClient();

  if (!redis) {
    enforceLocalRateLimit(rateKey, categoryLimits[input.category]);
    acquireLocalConcurrency(userConcurrencyKey, 4);
    try {
      acquireLocalConcurrency(definitionConcurrencyKey, 8);
    } catch (error) {
      releaseLocalConcurrency(userConcurrencyKey);
      throw error;
    }
    return async () => {
      releaseLocalConcurrency(userConcurrencyKey);
      releaseLocalConcurrency(definitionConcurrencyKey);
    };
  }

  try {
    await enforceRedisRateLimit(redis, rateKey, categoryLimits[input.category]);
    await acquireRedisConcurrency(redis, userConcurrencyKey, 4);
    try {
      await acquireRedisConcurrency(redis, definitionConcurrencyKey, 8);
    } catch (error) {
      await releaseRedisConcurrency(redis, userConcurrencyKey);
      throw error;
    }
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    logger.error("Custom widget rate limiter is unavailable", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Request limiter is unavailable" });
  }

  return async () => {
    try {
      await Promise.all([
        releaseRedisConcurrency(redis, userConcurrencyKey),
        releaseRedisConcurrency(redis, definitionConcurrencyKey),
      ]);
    } catch (error) {
      logger.error("Failed to release custom widget request capacity", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  };
};
