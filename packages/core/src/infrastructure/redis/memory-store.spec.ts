// @vitest-environment node

import { describe, expect, test } from "vitest";

import { MemoryStateClient } from "./memory-client";
import { MemoryStateStore } from "./memory-store";

const fixture = (budget = 16 * 1024 * 1024, maxSubscriptions = 4096) => {
  let now = 1000;
  const store = new MemoryStateStore(budget, () => now, maxSubscriptions);
  const client = new MemoryStateClient(store);
  return {
    store,
    client,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
  };
};

describe("bounded local state", () => {
  test("expires values without per-key timers and rejects unsupported operations", async () => {
    const { client, advance } = fixture();
    await client.set("secret", "value", "PX", 100);
    advance(99);
    expect(await client.get("secret")).toBe("value");
    advance(1);
    expect(await client.get("secret")).toBeNull();
    await expect(client.set("key", "value", "unsupported")).rejects.toThrow("Unsupported");
    expect("eval" in client).toBe(false);
  });

  test("evicts least recently used cache values and accounts for metadata", () => {
    const { store } = fixture(2048);
    store.set("first", "a".repeat(250));
    store.set("second", "b".repeat(250));
    store.get("first");
    store.set("third", "c".repeat(250));
    expect(store.get("first")).not.toBeNull();
    expect(store.get("second")).toBeNull();
    expect(store.stats.bytes).toBeLessThanOrEqual(2048);
    expect(store.stats.bytes).toBeGreaterThan(400);
  });

  test("bounded histories retain recent events and hash evidence honors expiration", async () => {
    const { store, client, advance } = fixture(4096);
    for (let index = 0; index < 200; index++) await client.lpush("history", String(index).repeat(30));
    const history = await client.lrange("history", 0, -1);
    expect(history[0]).toBe("199".repeat(30));
    expect(history.length).toBeLessThan(20);
    expect(store.stats.bytes).toBeLessThanOrEqual(4096);
    await client.multi().hset("evidence", "entry", "proof").pexpire("evidence", 10).exec();
    expect(await client.hvals("evidence")).toEqual(["proof"]);
    advance(10);
    expect(await client.hvals("evidence")).toEqual([]);
  });

  test("one competing request owns a lease; expired owners cannot release, renew, or commit", async () => {
    const { client, advance } = fixture();
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, index) => client.set("lock", String(index), "PX", 10, "NX")),
    );
    expect(results.filter((value) => value === "OK")).toHaveLength(1);
    expect(await client.setOwnedAsync("lock", "0", "payload", "old", 100)).toBe(true);
    advance(10);
    expect(await client.set("lock", "new-owner", "PX", 100, "NX")).toBe("OK");
    await client.releaseOwnedAsync("lock", "0");
    expect(await client.renewOwnedAsync("lock", "0", 60)).toBe(false);
    expect(await client.setOwnedAsync("lock", "0", "payload", "stale", 100)).toBe(false);
    expect(await client.setOwnedAsync("lock", "0", "persistent", "stale")).toBe(false);
    expect(await client.get("lock")).toBe("new-owner");
    expect(await client.get("payload")).toBe("old");
    expect(await client.setOwnedAsync("lock", "new-owner", "persistent", "current")).toBe(true);
    expect(await client.renewOwnedAsync("lock", "new-owner", 1)).toBe(true);
    await client.releaseOwnedAsync("lock", "new-owner");
    expect(await client.get("lock")).toBeNull();
  });

  test("cache pressure cannot evict live locks or generation fences", async () => {
    const { store, client } = fixture(4096);
    await client.set("lock", "owner", "PX", 100, "NX");
    const generation = await client.advanceGenerationAsync("generation", 60);
    for (let index = 0; index < 100; index++) await client.set(`cache:${index}`, "x".repeat(500));
    expect(await client.get("lock")).toBe("owner");
    expect(await client.get("generation")).toBe(generation);
    expect(store.stats.bytes).toBeLessThanOrEqual(4096);
    await expect(client.set("oversized", "x".repeat(4096))).rejects.toThrow("capacity");
    expect(await client.get("lock")).toBe("owner");
  });

  test("exhausted protected state fails closed and recovers after expiry", async () => {
    const { store, client, advance } = fixture(1024);
    await client.set("one", "owner", "PX", 10, "NX");
    await client.set("two", "owner", "PX", 10, "NX");
    await client.set("three", "owner", "PX", 10, "NX");
    await expect(client.set("four", "owner", "PX", 10, "NX")).rejects.toThrow("capacity");
    expect(store.stats.bytes).toBeLessThanOrEqual(1024);
    advance(10);
    expect(await client.set("four", "owner", "PX", 10, "NX")).toBe("OK");
  });

  test("generation advance and credential eviction execute atomically", async () => {
    const { client, advance } = fixture();
    await client.set("session", "old-secret");
    const generations = await Promise.all(
      Array.from({ length: 50 }, () => client.advanceGenerationAsync("generation", 60, "global", "session")),
    );
    expect(new Set(generations).size).toBe(50);
    expect(await client.get("session")).toBeNull();
    const global = await client.advanceGenerationAsync("global", 60);
    expect(await client.advanceGenerationAsync("generation", 60, "global")).toMatch(`${global}:`);
    advance(60_000);
    const next = await client.advanceGenerationAsync("generation", 60);
    expect(generations).not.toContain(next);
  });

  test("preview revisions permit exactly one concurrent edit and never resurrect deleted sessions", async () => {
    const { client } = fixture();
    await client.set("preview", JSON.stringify({ revision: 1 }), "PX", 100);
    const revisions = await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        client.compareAndSwapRevisionAsync("preview", 1, JSON.stringify({ revision: 2, editor: index }), 100),
      ),
    );
    expect(revisions.filter(Boolean)).toHaveLength(1);
    await client.del("preview");
    expect(await client.compareAndSwapRevisionAsync("preview", 2, "{}", 100)).toBe(false);
    await client.set("preview", "broken-json");
    expect(await client.compareAndSwapRevisionAsync("preview", 2, "{}", 100)).toBe(false);
  });

  test("rate counters share a fixed window and cannot be reset by cache pressure", async () => {
    const { store, client, advance } = fixture(4096);
    const counts = await Promise.all(Array.from({ length: 20 }, () => client.incrementRateAsync("rate", 100)));
    expect(counts.map((result) => result.count)).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    advance(30);
    for (let index = 0; index < 20; index++) store.set(`cache:${index}`, "x".repeat(500));
    expect(await client.incrementRateAsync("rate", 100)).toEqual({ count: 21, retryAfterMs: 70 });
    advance(70);
    expect(await client.incrementRateAsync("rate", 100)).toEqual({ count: 1, retryAfterMs: 100 });
  });

  test("concurrency leases enforce capacity, ownership, and expiry", async () => {
    const { client, advance } = fixture();
    const owners = await Promise.all(
      Array.from({ length: 20 }, (_, index) => client.acquireConcurrencyAsync("slots", String(index), 2, 100)),
    );
    expect(owners.filter(Boolean)).toHaveLength(2);
    await client.releaseConcurrencyAsync("slots", "intruder");
    expect(await client.acquireConcurrencyAsync("slots", "next", 2, 100)).toBe(false);
    await client.releaseConcurrencyAsync("slots", "0");
    expect(await client.acquireConcurrencyAsync("slots", "next", 2, 100)).toBe(true);
    advance(100);
    expect(await client.acquireConcurrencyAsync("slots", "after-expiry", 2, 100)).toBe(true);
  });

  test("short concurrency leases cannot expire another owner's longer lease", async () => {
    const { client, advance } = fixture();
    expect(await client.acquireConcurrencyAsync("mixed", "long", 2, 1000)).toBe(true);
    expect(await client.acquireConcurrencyAsync("mixed", "short", 2, 10)).toBe(true);
    advance(10);
    expect(await client.acquireConcurrencyAsync("mixed", "next", 1, 10)).toBe(false);
    await client.releaseConcurrencyAsync("mixed", "long");
    expect(await client.acquireConcurrencyAsync("mixed", "next", 1, 10)).toBe(true);
  });

  test("subscriptions have a shared byte/count budget and unsubscribe releases all metadata", async () => {
    const { store } = fixture(4096, 2);
    const messages: string[] = [];
    const one = store.subscribe("channel", (message) => {
      messages.push(message);
    });
    const two = store.subscribe("channel", () => {
      throw new Error("subscriber failed");
    });
    expect(() => store.subscribe("other", () => undefined)).toThrow("subscription limit");
    expect(store.publish("channel", "hello")).toBe(2);
    expect(messages).toEqual(["hello"]);
    one.unsubscribe();
    one.unsubscribe();
    two.unsubscribe();
    expect(store.publish("channel", "after-unsubscribe")).toBe(0);
    expect(store.stats).toMatchObject({ bytes: 0, subscriptions: 0, entries: 0 });
  });

  test("slow subscribers retain one promise and no unbounded message backlog", async () => {
    const { store } = fixture();
    let resolve = () => undefined as void;
    const pending = new Promise<void>((finish) => {
      resolve = finish;
    });
    const messages: string[] = [];
    const subscription = store.subscribe("stream", (message) => {
      messages.push(message);
      return pending;
    });
    for (let index = 0; index < 1000; index++) store.publish("stream", String(index));
    expect(messages).toEqual(["0"]);
    resolve();
    await pending;
    await Promise.resolve();
    await Promise.resolve();
    store.publish("stream", "next");
    expect(messages).toEqual(["0", "next"]);
    subscription.unsubscribe();
  });
});
