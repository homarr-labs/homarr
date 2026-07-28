import { randomUUID } from "node:crypto";

import { RedisContainer } from "@testcontainers/redis";
import type { StartedRedisContainer } from "@testcontainers/redis";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createRedisCustomWidgetResponseCache } from "../../custom-widget/response-cache";

describe("custom widget response cache across replicas", () => {
  let container: StartedRedisContainer | undefined;
  let redisA: Redis | undefined;
  let redisB: Redis | undefined;

  beforeAll(async () => {
    container = await new RedisContainer("redis:7.4-alpine").start();
    redisA = new Redis(container.getConnectionUrl());
    redisB = new Redis(container.getConnectionUrl());
    await Promise.all([redisA.ping(), redisB.ping()]);
  }, 60_000);

  afterAll(async () => {
    await Promise.all([redisA?.quit(), redisB?.quit()]);
    await container?.stop();
  }, 30_000);

  test("an action on one replica invalidates a query cached by another replica", async () => {
    if (!redisA || !redisB) throw new Error("Redis test clients were not initialized");
    const cacheA = createRedisCustomWidgetResponseCache(redisA);
    const cacheB = createRedisCustomWidgetResponseCache(redisB);
    const itemNamespace = `custom-jsx:${randomUUID()}:`;
    const namespace = `${itemNamespace}definition-v1:status:`;
    const input = {
      baseUrl: "https://example.com",
      method: "GET" as const,
      networkScope: "public" as const,
      kind: "query" as const,
      cacheKey: `${namespace}same-options`,
      cacheTtlSeconds: 60,
    };
    let calls = 0;
    const execute = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      data: { calls: ++calls },
    });

    await expect(cacheA.withCache(input, execute)).resolves.toMatchObject({ data: { calls: 1 } });
    await expect(cacheB.withCache(input, execute)).resolves.toMatchObject({ data: { calls: 1 } });
    expect(calls).toBe(1);

    await cacheB.invalidate([itemNamespace]);

    await expect(cacheA.withCache(input, execute)).resolves.toMatchObject({ data: { calls: 2 } });
    expect(calls).toBe(2);
  });
});
