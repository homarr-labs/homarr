import type { RedisOptions } from "ioredis";

import type { RedisClient } from "@homarr/core/infrastructure/redis";
import { createRedisClient } from "@homarr/core/infrastructure/redis";

/**
 * Creates a new Redis connection
 * @returns redis client
 */
export const createRedisConnection = (options: RedisOptions = {}) => {
  if (Boolean(process.env.CI) || Boolean(process.env.DISABLE_REDIS_LOGS)) {
    return null;
  }

  return createRedisClient(options);
};

export const requireRedisConnection = (client: RedisClient | null): RedisClient => {
  if (!client) throw new Error("Redis is unavailable in this process");
  return client;
};

const connectionWaits = new WeakMap<RedisClient, Promise<void>>();

// The response-cache client disables offline queues to avoid replaying expired
// locks. Let its initial handshake finish before submitting a command, within
// the existing 750 ms operation budget (200 ms connect + 500 ms command).
export const waitForRedisConnectionAsync = async (client: RedisClient | null) => {
  if (!client || client.options.enableOfflineQueue !== false || client.status === "ready") return client;
  let waiting = connectionWaits.get(client);
  if (!waiting) {
    waiting = new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        client.off("ready", onReady);
        client.off("error", onError);
        client.off("end", onEnd);
        if (error) reject(error);
        else resolve();
      };
      const onReady = () => finish();
      const onError = () => finish(new Error("Redis connection is unavailable"));
      const onEnd = () => finish(new Error("Redis connection ended"));
      const timer = setTimeout(() => finish(new Error("Redis connection readiness timed out")), 200);
      timer.unref();
      client.once("ready", onReady);
      client.once("error", onError);
      client.once("end", onEnd);
    }).finally(() => connectionWaits.delete(client));
    connectionWaits.set(client, waiting);
  }
  await waiting;
  return client;
};

export const requireReadyRedisConnectionAsync = async (client: RedisClient | null) =>
  requireRedisConnection(await waitForRedisConnectionAsync(client));
