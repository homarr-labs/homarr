import { createLogger } from "@homarr/core/infrastructure/logs";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { CustomWidgetDomainError, CustomWidgetRequestLimiter } from "@homarr/custom-widgets/server";
import type { RequestLimitInput, RequestLimitStore } from "@homarr/custom-widgets/server";

import { useProcessLocalCustomWidgetState } from "../../custom-widget-state-mode";
import { toTrpcError } from "./domain-error";

const logger = createLogger({ module: "custom-widget:limits" });
const RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('PTTL', KEYS[1]) }
`;
const ACQUIRE_SCRIPT = `
local time = redis.call('TIME')
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], now + tonumber(ARGV[3]), ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1
`;
const RELEASE_SCRIPT = `
return redis.call('ZREM', KEYS[1], ARGV[1])
`;

class RedisRequestLimitStore implements RequestLimitStore {
  public constructor(private readonly redis: RedisClient) {}

  public async incrementRate(key: string, windowMs: number) {
    const [count, retryAfterMs] = (await this.redis.eval(RATE_SCRIPT, 1, key, windowMs)) as [number, number];
    return { count: Number(count), retryAfterMs: Number(retryAfterMs) || windowMs };
  }

  public async acquireConcurrency(key: string, ownerId: string, limit: number, ttlMs: number) {
    return Number(await this.redis.eval(ACQUIRE_SCRIPT, 1, key, ownerId, limit, ttlMs)) > 0;
  }

  public async releaseConcurrency(key: string, ownerId: string) {
    await this.redis.eval(RELEASE_SCRIPT, 1, key, ownerId);
  }
}

let limiter: CustomWidgetRequestLimiter | undefined;
function getLimiter() {
  if (limiter) return limiter;
  const useLocal = useProcessLocalCustomWidgetState();
  const store = useLocal ? undefined : new RedisRequestLimitStore(createRedisClient());
  limiter = new CustomWidgetRequestLimiter({
    store,
    onStoreError: (error) =>
      logger.error("Custom widget rate limiter is unavailable", {
        event: "custom_widget_rate_limit_store_unavailable",
        errorName: error instanceof Error ? error.name : "UnknownError",
      }),
  });
  return limiter;
}

export async function acquireCustomWidgetRequestLimit(input: RequestLimitInput): Promise<() => Promise<void>> {
  try {
    const release = await getLimiter().acquire(input);
    return async () => {
      try {
        await release();
      } catch (error) {
        logger.error("Failed to release custom widget request capacity", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
      }
    };
  } catch (error) {
    if (error instanceof CustomWidgetDomainError && error.code === "TOO_MANY_REQUESTS") {
      logger.warn("Rejected custom widget request at rate or concurrency limit", {
        event: "custom_widget_rate_limit_rejected",
        category: input.category,
        authenticated: Boolean(input.userId),
        retryAfterMs: error.retryAfterMs,
      });
    }
    toTrpcError(error);
  }
}
