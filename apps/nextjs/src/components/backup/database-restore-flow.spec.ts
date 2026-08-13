// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { waitForServerReadinessAsync } from "./database-restore-flow";

describe("waitForServerReadinessAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts checking after the server-provided restart delay and returns when ready", async () => {
    const controller = new AbortController();
    const requestReady = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const readiness = waitForServerReadinessAsync({
      restartAfterMs: 500,
      signal: controller.signal,
      timeoutMs: 5_000,
      pollIntervalMs: 250,
      requestReady,
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(requestReady).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(requestReady).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(250);
    await expect(readiness).resolves.toBe("ready");
    expect(requestReady).toHaveBeenCalledTimes(2);
  });

  it("times out even when a readiness request never settles on its own", async () => {
    const controller = new AbortController();
    const requestReady = vi.fn(
      (signal: AbortSignal) =>
        new Promise<boolean>((resolve) => {
          signal.addEventListener("abort", () => resolve(false), { once: true });
        }),
    );
    const readiness = waitForServerReadinessAsync({
      restartAfterMs: 0,
      signal: controller.signal,
      timeoutMs: 1_000,
      pollIntervalMs: 100,
      requestTimeoutMs: 400,
      requestReady,
    });

    await vi.advanceTimersByTimeAsync(1_001);

    await expect(readiness).resolves.toBe("timedOut");
    expect(requestReady).toHaveBeenCalledTimes(3);
  });

  it("stops cleanly when the restore flow is unmounted", async () => {
    const controller = new AbortController();
    const requestReady = vi.fn().mockResolvedValue(false);
    const readiness = waitForServerReadinessAsync({
      restartAfterMs: 500,
      signal: controller.signal,
      requestReady,
    });

    controller.abort();

    await expect(readiness).resolves.toBe("aborted");
    expect(requestReady).not.toHaveBeenCalled();
  });
});
