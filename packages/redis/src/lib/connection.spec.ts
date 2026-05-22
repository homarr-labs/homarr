import { describe, expect, test, vi } from "vitest";

import { createRedisClient } from "@homarr/core/infrastructure/redis";

import { createRedisConnection } from "./connection";

const mockRedisInstance = { ping: vi.fn() };

vi.mock("@homarr/core/infrastructure/redis", () => ({
  createRedisClient: vi.fn(() => mockRedisInstance),
}));

describe("createRedisConnection", () => {
  test("returns a redis client regardless of CI env", () => {
    const original = process.env.CI;
    process.env.CI = "true";

    const client = createRedisConnection();

    expect(client).toBe(mockRedisInstance);
    expect(client).not.toBeNull();

    process.env.CI = original;
  });

  test("returns a redis client when DISABLE_REDIS_LOGS is set", () => {
    const original = process.env.DISABLE_REDIS_LOGS;
    process.env.DISABLE_REDIS_LOGS = "true";

    const client = createRedisConnection();

    expect(client).toBe(mockRedisInstance);
    expect(client).not.toBeNull();

    process.env.DISABLE_REDIS_LOGS = original;
  });

  test("always delegates to createRedisClient", () => {
    vi.mocked(createRedisClient).mockClear();

    createRedisConnection();

    expect(createRedisClient).toHaveBeenCalledOnce();
  });
});
