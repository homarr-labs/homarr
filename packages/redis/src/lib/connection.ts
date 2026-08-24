import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { createRedisClient } from "@homarr/core/infrastructure/redis";

/**
 * Creates a new Redis connection
 * @returns redis client
 */
export const createRedisConnection = () => {
  if (Boolean(process.env.CI) || Boolean(process.env.DISABLE_REDIS_LOGS)) {
    return null;
  }

  return createRedisClient();
};

export const requireRedisConnection = (client: RedisClient | null): RedisClient => {
  if (!client) throw new Error("Redis is unavailable in this process");
  return client;
};
