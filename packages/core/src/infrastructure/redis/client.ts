import type { RedisOptions } from "ioredis";

import { redisEnv } from "./env";
import { MemoryStateClient } from "./memory-client";
import { MemoryStateStore } from "./memory-store";
import { RedisStateClient } from "./redis-client";
import type { StateClient } from "./state";

const defaultRedisOptions = {
  connectionName: "homarr",
} satisfies RedisOptions;

export type RedisClient = StateClient;
export { MemoryStateClient, MemoryStateStore };

export const isMemoryStateBackend = () => {
  const backend = process.env.HOMARR_STATE_BACKEND ?? process.env.WORKER_STATE_BACKEND ?? "redis";
  if (backend !== "memory" && backend !== "redis") throw new Error("Unsupported Homarr state backend");
  return backend === "memory";
};

let memoryStore: MemoryStateStore | undefined;
export const getMemoryStateStore = () => {
  if (!memoryStore) {
    const maxBytes = Number(process.env.HOMARR_STATE_MAX_BYTES ?? 16 * 1024 * 1024);
    memoryStore = new MemoryStateStore(maxBytes);
  }
  return memoryStore;
};

export const createRedisClient = (options: RedisOptions = {}): StateClient => {
  if (isMemoryStateBackend()) return new MemoryStateClient(getMemoryStateStore(), options);
  if (redisEnv.IS_EXTERNAL) {
    return new RedisStateClient({
      ...defaultRedisOptions,
      host: redisEnv.HOST,
      port: redisEnv.PORT,
      db: redisEnv.DATABASE_INDEX,
      tls: redisEnv.TLS_CA
        ? {
            ca: redisEnv.TLS_CA,
          }
        : undefined,
      username: redisEnv.USERNAME,
      password: redisEnv.PASSWORD,
      ...options,
    });
  }
  return new RedisStateClient({ ...defaultRedisOptions, ...options });
};
