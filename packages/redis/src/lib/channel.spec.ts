// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

vi.mock("./connection", () => ({
  createRedisConnection: () => null,
  getDataClient: () => null,
  getSubscriberClient: () => null,
  usesMemoryFallback: () => true,
}));

import { createLockChannel, createSubPubChannel } from "./channel";

describe("createLockChannel", () => {
  test("degrades gracefully when Redis connections are disabled", async () => {
    const lock = createLockChannel("test-lock");

    const token = await lock.acquireAsync(60);

    expect(token).toEqual(expect.any(String));
    if (!token) throw new Error("Expected the fallback lock to return a token");
    await expect(lock.releaseAsync(token)).resolves.toBeUndefined();
  });
});

describe("createSubPubChannel with memory fallback", () => {
  test("publish and subscribe deliver messages in-process", async () => {
    const channel = createSubPubChannel<{ value: number }>("test-pubsub");

    const received: { value: number }[] = [];
    channel.subscribe((data) => {
      received.push(data);
    });

    await channel.publishAsync({ value: 42 });

    expect(received).toEqual([{ value: 42 }]);
    await expect(channel.getLastDataAsync()).resolves.toEqual({ value: 42 });
  });

  test("subscribe replays last persisted data", async () => {
    const channel = createSubPubChannel<string>("test-replay");
    await channel.publishAsync("hello");

    const replayed: string[] = [];
    channel.subscribe((data) => {
      replayed.push(data);
    });

    expect(replayed).toEqual(["hello"]);
  });
});
