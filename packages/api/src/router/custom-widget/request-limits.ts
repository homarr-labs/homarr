import { createLogger } from "@homarr/core/infrastructure/logs";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { CustomWidgetRequestLimiter } from "@homarr/custom-widgets/server";
import type { RequestLimitInput, RequestLimitStore } from "@homarr/custom-widgets/server";

import { toTrpcError } from "./domain-error";

const logger = createLogger({ module: "custom-widget:limits" });
const RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('PTTL', KEYS[1]) }
`;
const ACQUIRE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
if count > tonumber(ARGV[1]) then redis.call('DECR', KEYS[1]); return 0 end
return count
`;
const RELEASE_SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count <= 1 then redis.call('DEL', KEYS[1]); return 0 end
return redis.call('DECR', KEYS[1])
`;

class RedisRequestLimitStore implements RequestLimitStore {
  public constructor(private readonly redis: RedisClient) {}

  public async incrementRate(key: string, windowMs: number) {
    const [count, retryAfterMs] = (await this.redis.eval(RATE_SCRIPT, 1, key, windowMs)) as [number, number];
    return { count: Number(count), retryAfterMs: Number(retryAfterMs) || windowMs };
  }

  public async acquireConcurrency(key: string, limit: number, ttlMs: number) {
    return Number(await this.redis.eval(ACQUIRE_SCRIPT, 1, key, limit, ttlMs)) > 0;
  }

  public async releaseConcurrency(key: string) {
    await this.redis.eval(RELEASE_SCRIPT, 1, key);
  }
}

let limiter: CustomWidgetRequestLimiter | undefined;
function getLimiter() {
  if (limiter) return limiter;
  const useLocal = process.env.CI !== undefined || process.env.NODE_ENV === "test";
  const store = useLocal ? undefined : new RedisRequestLimitStore(createRedisClient());
  limiter = new CustomWidgetRequestLimiter({
    store,
    onStoreError: (error) =>
      logger.error("Custom widget rate limiter is unavailable", {
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
    toTrpcError(error);
  }
}
