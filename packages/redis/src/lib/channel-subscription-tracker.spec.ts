import { beforeEach, describe, expect, test, vi } from "vitest";

import { ChannelSubscriptionTracker } from "./channel-subscription-tracker";
import { createRedisConnection } from "./connection";

const mockRedisClient = {
  subscribe: vi.fn().mockResolvedValue("OK"),
  unsubscribe: vi.fn().mockResolvedValue("OK"),
  on: vi.fn(),
};

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({ debug: vi.fn(), warn: vi.fn() }),
}));

vi.mock("./connection", () => ({
  createRedisConnection: vi.fn(() => mockRedisClient),
}));

describe("ChannelSubscriptionTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset static state between tests
    // @ts-expect-error accessing private static for test reset
    ChannelSubscriptionTracker.subscriptions = new Map();
    // @ts-expect-error accessing private static for test reset
    ChannelSubscriptionTracker._redis = undefined;
    // @ts-expect-error accessing private static for test reset
    ChannelSubscriptionTracker.listenerActive = false;
  });

  test("redis client is lazily created on first subscribe", () => {
    vi.mocked(createRedisConnection).mockClear();

    ChannelSubscriptionTracker.subscribe("channel-1", vi.fn());

    expect(createRedisConnection).toHaveBeenCalledOnce();
  });

  test("redis client is reused across multiple subscribes", () => {
    vi.mocked(createRedisConnection).mockClear();

    ChannelSubscriptionTracker.subscribe("channel-1", vi.fn());
    ChannelSubscriptionTracker.subscribe("channel-2", vi.fn());

    expect(createRedisConnection).toHaveBeenCalledOnce();
  });

  test("subscribes to redis channel on first callback for a channel", () => {
    ChannelSubscriptionTracker.subscribe("test-channel", vi.fn());

    expect(mockRedisClient.subscribe).toHaveBeenCalledWith("test-channel");
  });

  test("does not re-subscribe when adding second callback to same channel", () => {
    ChannelSubscriptionTracker.subscribe("test-channel", vi.fn());
    mockRedisClient.subscribe.mockClear();

    ChannelSubscriptionTracker.subscribe("test-channel", vi.fn());

    expect(mockRedisClient.subscribe).not.toHaveBeenCalled();
  });

  test("unsubscribe function removes the callback", () => {
    const unsubscribe = ChannelSubscriptionTracker.subscribe("test-channel", vi.fn());

    unsubscribe();

    expect(mockRedisClient.unsubscribe).toHaveBeenCalledWith("test-channel");
  });

  test("does not unsubscribe from redis if other callbacks remain", () => {
    ChannelSubscriptionTracker.subscribe("test-channel", vi.fn());
    const unsubscribe = ChannelSubscriptionTracker.subscribe("test-channel", vi.fn());

    unsubscribe();

    expect(mockRedisClient.unsubscribe).not.toHaveBeenCalled();
  });

  test("activates message listener only once", () => {
    ChannelSubscriptionTracker.subscribe("ch-1", vi.fn());
    ChannelSubscriptionTracker.subscribe("ch-2", vi.fn());

    expect(mockRedisClient.on).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.on).toHaveBeenCalledWith("message", expect.any(Function));
  });

  test("message listener dispatches to correct channel callbacks", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    ChannelSubscriptionTracker.subscribe("channel-a", callback1);
    ChannelSubscriptionTracker.subscribe("channel-b", callback2);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const messageHandler = mockRedisClient.on.mock.calls[0]![1] as (channel: string, message: string) => void;
    messageHandler("channel-a", "test-message");

    expect(callback1).toHaveBeenCalledWith("test-message");
    expect(callback2).not.toHaveBeenCalled();
  });
});
