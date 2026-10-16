import { createLogger } from "@homarr/core/infrastructure/logs";
import { createRedisClient } from "@homarr/core/infrastructure/redis";
import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { CustomWidgetRequestLimiter } from "@homarr/custom-widgets/server";
import type { RequestLimitInput, RequestLimitStore } from "@homarr/custom-widgets/server";

import { toTrpcError } from "./domain-error";

const logger = createLogger({ module: "custom-widget:limits" });

class RedisRequestLimitStore implements RequestLimitStore {
  public constructor(private readonly redis: RedisClient) {}

  public async incrementRate(key: string, windowMs: number) {
    return await this.redis.incrementRateAsync(key, windowMs);
  }

  public async acquireConcurrency(key: string, ownerId: string, limit: number, ttlMs: number) {
    return await this.redis.acquireConcurrencyAsync(key, ownerId, limit, ttlMs);
  }

  public async releaseConcurrency(key: string, ownerId: string) {
    await this.redis.releaseConcurrencyAsync(key, ownerId);
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
