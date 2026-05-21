import { createRedisClient } from "@homarr/core/infrastructure/redis";

export const createRedisConnection = () => createRedisClient();
