import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createCacheChannel,
  createGetSetChannel,
  createListChannel,
  createSubPubChannel,
  handshakeAsync,
} from "./channel";
import { createRedisConnection } from "./connection";

const mockRedisClient = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(1),
  publish: vi.fn().mockResolvedValue(1),
  lrange: vi.fn().mockResolvedValue([]),
  lrem: vi.fn().mockResolvedValue(0),
  lpush: vi.fn().mockResolvedValue(1),
  ltrim: vi.fn().mockResolvedValue("OK"),
  llen: vi.fn().mockResolvedValue(0),
  hello: vi.fn().mockResolvedValue({}),
  subscribe: vi.fn().mockResolvedValue("OK"),
  on: vi.fn(),
};

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock("./connection", () => ({
  createRedisConnection: vi.fn(() => mockRedisClient),
}));

vi.mock("./channel-subscription-tracker", () => ({
  ChannelSubscriptionTracker: {
    subscribe: vi.fn(() => vi.fn()),
  },
}));

describe("channel lazy initialization", () => {
  beforeEach(() => {
    vi.mocked(createRedisConnection).mockClear();
  });

  test("getSetClient is lazily created on first channel operation", async () => {
    vi.mocked(createRedisConnection).mockClear();

    const channel = createGetSetChannel<string>("test-lazy");
    expect(createRedisConnection).not.toHaveBeenCalled();

    await channel.getAsync();

    expect(createRedisConnection).toHaveBeenCalled();
  });

  test("publisher is lazily created on first publish", async () => {
    const channel = createSubPubChannel<string>("test-pub", { persist: false });

    const callsBefore = vi.mocked(createRedisConnection).mock.calls.length;
    await channel.publishAsync("hello");

    expect(vi.mocked(createRedisConnection).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  test("handshakeAsync creates a client and calls hello", async () => {
    await handshakeAsync();

    expect(mockRedisClient.hello).toHaveBeenCalledOnce();
  });
});

describe("createSubPubChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("publishAsync persists data and publishes", async () => {
    const channel = createSubPubChannel<{ value: number }>("test-channel");

    await channel.publishAsync({ value: 42 });

    expect(mockRedisClient.set).toHaveBeenCalledOnce();
    expect(mockRedisClient.publish).toHaveBeenCalledOnce();
  });

  test("publishAsync with persist:false skips set", async () => {
    const channel = createSubPubChannel<string>("no-persist", { persist: false });

    await channel.publishAsync("data");

    expect(mockRedisClient.set).not.toHaveBeenCalled();
    expect(mockRedisClient.publish).toHaveBeenCalledOnce();
  });

  test("getLastDataAsync returns null when no data", async () => {
    const channel = createSubPubChannel<string>("empty");

    const result = await channel.getLastDataAsync();

    expect(result).toBeNull();
  });
});

describe("createListChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("addAsync pushes to list", async () => {
    const channel = createListChannel<string>("test-list");

    await channel.addAsync("item1");

    expect(mockRedisClient.lpush).toHaveBeenCalledOnce();
  });

  test("clearAsync deletes the list", async () => {
    const channel = createListChannel<string>("test-list");

    await channel.clearAsync();

    expect(mockRedisClient.del).toHaveBeenCalledOnce();
  });
});

describe("createCacheChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("invalidateAsync deletes the cache key", async () => {
    const channel = createCacheChannel<string>("test-cache");

    await channel.invalidateAsync();

    expect(mockRedisClient.del).toHaveBeenCalledWith("cache:test-cache");
  });

  test("getAsync returns null when no cached data", async () => {
    const channel = createCacheChannel<string>("test-cache");

    const result = await channel.getAsync();

    expect(result).toBeNull();
  });
});
