import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { handshakeAsync } from "@homarr/redis";

import { waitForRedisAsync } from "./main";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("./overrides", () => ({}));

vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => mockLogger,
}));

vi.mock("@homarr/redis", () => ({
  handshakeAsync: vi.fn(),
}));

vi.mock("@homarr/cron-jobs", () => ({
  jobGroup: {
    initializeAsync: vi.fn().mockResolvedValue(undefined),
    startAllAsync: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./on-start", () => ({
  onStartAsync: vi.fn().mockResolvedValue(undefined),
}));

describe("waitForRedisAsync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("succeeds on first attempt", async () => {
    vi.mocked(handshakeAsync).mockResolvedValueOnce(undefined);

    await waitForRedisAsync();

    expect(handshakeAsync).toHaveBeenCalledOnce();
    expect(mockLogger.info).toHaveBeenCalledWith("Redis connection established");
  });

  test("retries on failure then succeeds", async () => {
    vi.mocked(handshakeAsync)
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(undefined);

    const promise = waitForRedisAsync();

    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(handshakeAsync).toHaveBeenCalledTimes(3);
    expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith("Redis connection established");
  });

  test("logs error and proceeds after max retries exhausted", async () => {
    vi.mocked(handshakeAsync).mockRejectedValue(new Error("ECONNREFUSED"));

    const promise = waitForRedisAsync();

    for (let index = 0; index < 10; index++) {
      await vi.advanceTimersByTimeAsync(500);
    }
    await promise;

    expect(handshakeAsync).toHaveBeenCalledTimes(10);
    expect(mockLogger.error).toHaveBeenCalledWith("Redis did not become ready after retries, proceeding anyway");
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  test("warns with attempt count on each retry", async () => {
    vi.mocked(handshakeAsync).mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce(undefined);

    const promise = waitForRedisAsync();

    await vi.advanceTimersByTimeAsync(500);
    await promise;

    expect(mockLogger.warn).toHaveBeenCalledWith("Redis not ready, retrying (1/10)...");
  });

  test("does not retry after success", async () => {
    vi.mocked(handshakeAsync).mockResolvedValueOnce(undefined);

    await waitForRedisAsync();

    expect(handshakeAsync).toHaveBeenCalledOnce();
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });
});
