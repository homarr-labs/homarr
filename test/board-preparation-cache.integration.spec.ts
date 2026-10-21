import { RedisContainer } from "@testcontainers/redis";
import type { StartedRedisContainer } from "@testcontainers/redis";
import { Redis } from "ioredis";
import type { createLockChannel as createLock } from "../packages/redis/src/lib/channel";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";

const connection = vi.hoisted(() => ({ client: undefined as Redis | undefined }));
vi.mock("../packages/redis/src/lib/connection", () => ({
  createRedisConnection: () => connection.client,
  requireReadyRedisConnectionAsync: async (client: Redis) => client,
}));

const getClient = () => {
  if (!connection.client) throw new Error("Redis has not been initialized");
  return connection.client;
};

let container: StartedRedisContainer;
let createLockChannel: typeof createLock;
const budget = { indexName: "document-budget", maxBytes: 200, maxEntries: 3 };

beforeAll(async () => {
  container = await new RedisContainer("redis:8-alpine").start();
  connection.client = new Redis(container.getConnectionUrl());
  ({ createLockChannel } = await import("../packages/redis/src/lib/channel"));
}, 60_000);
beforeEach(async () => {
  await connection.client?.flushdb();
});
afterAll(async () => {
  connection.client?.disconnect();
  await container?.stop();
});

describe("bounded prepared document publication", () => {
  test("enforces one byte and entry budget across concurrent writers and build namespaces", async () => {
    const lock = createLockChannel("lease");
    const token = await lock.acquireAsync(60);
    if (!token) throw new Error("No lease");
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, index) =>
        lock.setIfOwnedWithinBudgetAsync(token, `build-${index}:document`, "🌍".repeat(12), 60_000, budget),
      ),
    );
    expect(results.every(Boolean)).toBe(true);
    const keys = await getClient().zrange(budget.indexName, 0, -1);
    const sizes = await Promise.all(keys.map((key) => getClient().strlen(key)));
    expect(keys.length).toBeLessThanOrEqual(budget.maxEntries);
    expect(sizes.reduce((total, size) => total + size, 0)).toBeLessThanOrEqual(budget.maxBytes);
    expect(await getClient().get("build-0:document")).toBeNull();
    expect(await getClient().get("build-39:document")).not.toBeNull();
  });

  test("a stale lease or oversized value cannot evict or replace a published document", async () => {
    const lock = createLockChannel("lease");
    const token = await lock.acquireAsync(60);
    if (!token) throw new Error("No lease");
    expect(await lock.setIfOwnedWithinBudgetAsync(token, "old", "retained", 60_000, budget)).toBe(true);
    const original = await getClient().get("old");
    expect(await lock.setIfOwnedWithinBudgetAsync("stale", "new", "data", 60_000, budget)).toBe(false);
    expect(await lock.setIfOwnedWithinBudgetAsync(token, "old", "x".repeat(201), 60_000, budget)).toBe(false);
    expect(await getClient().get("old")).toBe(original);
    expect(await getClient().zrange(budget.indexName, 0, -1)).toEqual(["old"]);
  });

  test("a shorter entry lifetime cannot make the budget forget longer-lived documents", async () => {
    const lock = createLockChannel("lease");
    const token = await lock.acquireAsync(60);
    if (!token) throw new Error("No lease");
    await lock.setIfOwnedWithinBudgetAsync(token, "long", "retained", 60_000, budget);
    await lock.setIfOwnedWithinBudgetAsync(token, "short", "data", 1_000, budget);
    expect(await getClient().pttl(budget.indexName)).toBeGreaterThan(50_000);
  });

  test("replacing an entry counts its new bytes once and removes expired index members", async () => {
    const lock = createLockChannel("lease");
    const token = await lock.acquireAsync(60);
    if (!token) throw new Error("No lease");
    await lock.setIfOwnedWithinBudgetAsync(token, "expired", "data", 60_000, budget);
    await getClient().del("expired");
    await lock.setIfOwnedWithinBudgetAsync(token, "retained", "data", 60_000, budget);
    await lock.setIfOwnedWithinBudgetAsync(token, "retained", "x".repeat(160), 60_000, budget);
    expect(await getClient().zrange(budget.indexName, 0, -1)).toEqual(["retained"]);
    expect(await getClient().pttl("retained")).toBeGreaterThan(0);
  });
});
