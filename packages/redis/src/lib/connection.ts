import { Redis } from "ioredis";

/**
 * Creates a new Redis connection
 * @returns redis client
 */
export const createRedisConnection = () => new Redis();
