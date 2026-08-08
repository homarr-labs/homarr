import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { createRedisClient } from "@homarr/core/infrastructure/redis";

let dataClient: RedisClient | undefined;
let subscriberClient: RedisClient | undefined;

const isRedisExplicitlyDisabled = () => process.env.CI === "true" || process.env.CI === "1" || process.env.DISABLE_REDIS_LOGS === "true" || process.env.DISABLE_REDIS_LOGS === "1";

/**
 * In-process pub/sub fallback for single-instance deployments when Redis is unavailable.
 * Never used when REDIS_IS_EXTERNAL=true (multi-instance requires real Redis).
 */
export const usesMemoryFallback = (): boolean =>
  process.env.REDIS_IS_EXTERNAL !== "true" && isRedisExplicitlyDisabled();

/** Shared client for SET/GET/PUBLISH and other non-subscribe Redis commands. */
export const getDataClient = (): RedisClient | null => {
  if (usesMemoryFallback()) return null;
  dataClient ??= createRedisClient();
  return dataClient;
};

/** Dedicated client for SUBSCRIBE — ioredis requires a separate connection for pub/sub. */
export const getSubscriberClient = (): RedisClient | null => {
  if (usesMemoryFallback()) return null;
  subscriberClient ??= createRedisClient();
  return subscriberClient;
};

/** @deprecated Prefer getDataClient() — kept for test mocks. */
export const createRedisConnection = () => getDataClient();
