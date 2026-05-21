import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { createRedisClient } from "@homarr/core/infrastructure/redis";

/**
 * Creates a new Redis connection
 * @returns redis client
 */
export const createRedisConnection = (): RedisClient | null => {
  const disableRedisLogs = process.env.DISABLE_REDIS_LOGS === "true";

  if (disableRedisLogs) {
    return null;
  }

  return createRedisClient();
};
