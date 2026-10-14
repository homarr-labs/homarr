import { afterEach, describe, expect, test, vi } from "vitest";

import { runStateOperationAsync } from "./backing";
import { createStateChannels } from "./channels";
import { createStateGenerations } from "./generations";
import { createStateBackingFixture } from "./state.fixture";
import { createStateFanout } from "./fanout";

afterEach(() => vi.useRealTimers());

describe("injected atomic state fencing", () => {
  test("latest-value subscriptions replay an explicitly published null but do not emit an absent snapshot", async () => {
    const channels = createStateChannels(createStateBackingFixture());
    const fanout = createStateFanout(channels, { warn: vi.fn() });
    const channel = fanout.createSubPubChannel<string | null>("nullable");
    const absent = vi.fn();
    const unsubscribeAbsent = channel.subscribe(absent);
    await unsubscribeAbsent.readyAsync;
    expect(absent).not.toHaveBeenCalled();
    await channel.publishAsync(null);
    expect(absent).toHaveBeenCalledExactlyOnceWith(null);
    unsubscribeAbsent();
    const replay = vi.fn();
    const unsubscribeReplay = channel.subscribe(replay);
    await unsubscribeReplay.readyAsync;
    expect(replay).toHaveBeenCalledExactlyOnceWith(null);
    unsubscribeReplay();
    await channels.createGetSetChannel("pubSub:last:legacy-null").setAsync(null);
    const legacyReplay = vi.fn();
    const unsubscribeLegacy = fanout.createSubPubChannel<null>("legacy-null").subscribe(legacyReplay);
    await unsubscribeLegacy.readyAsync;
    expect(legacyReplay).toHaveBeenCalledExactlyOnceWith(null);
    unsubscribeLegacy();
    fanout.stop();
  });
  test("latest-value fanout subscribes before its snapshot and never replaces a racing live value with an older snapshot", async () => {
    const backing = createStateBackingFixture();
    const initial = createStateChannels(backing);
    await initial.createGetSetChannel("pubSub:last:status").setAsync("old");
    let release: (() => void) | undefined;
    const fanout = createStateFanout(
      createStateChannels({
        ...backing,
        readAsync: async (keys, operation) => {
          const snapshot = await backing.readAsync(keys, operation);
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return snapshot;
        },
      }),
      { warn: vi.fn() },
    );
    const channel = fanout.createSubPubChannel<string>("status");
    const callback = vi.fn();
    const unsubscribe = channel.subscribe(callback);
    await vi.waitFor(() => expect(release).toBeTypeOf("function"));
    await channel.publishAsync("new");
    release?.();
    await unsubscribe.readyAsync;
    expect(callback).toHaveBeenCalledExactlyOnceWith("new");
    unsubscribe();
    await channel.publishAsync("later");
    expect(callback).toHaveBeenCalledOnce();
    fanout.stop();
  });
  test("an expired owner cannot renew, release a replacement, or publish a late result", async () => {
    vi.useFakeTimers();
    const channels = createStateChannels(createStateBackingFixture());
    const lock = channels.createLockChannel("refresh");
    const first = await lock.acquireAsync(15);
    if (!first) throw new Error("Expected first owner");
    await vi.advanceTimersByTimeAsync(15_000);
    const replacement = await lock.acquireAsync(15);
    if (!replacement) throw new Error("Expected replacement owner");
    await expect(lock.renewAsync(first, 15)).resolves.toBe(false);
    await expect(lock.setPersistentIfOwnedAsync(first, "payload", "late")).resolves.toBe(false);
    await lock.releaseAsync(first);
    await expect(lock.setPersistentIfOwnedAsync(replacement, "payload", "new")).resolves.toBe(true);
    await expect(channels.createGetSetChannel("payload").getAsync()).resolves.toBe("new");
  });

  test("credential invalidation atomically clears session and last-good state and fences the previous generation", async () => {
    const backing = createStateBackingFixture();
    const channels = createStateChannels(backing);
    const generations = createStateGenerations(backing, { warn: vi.fn() });
    const previous = await generations.getIntegrationCacheGenerationAsync("source");
    await channels.createGetSetChannel("session-store:source").setAsync("encrypted");
    await channels.createGetSetChannel("integration-stats:snapshot:v1:source").setAsync("private");
    const lock = channels.createLockChannel("refresh");
    const token = await lock.acquireAsync(120);
    if (!token) throw new Error("Expected refresh owner");
    await generations.invalidateIntegrationCacheAsync("source");
    await expect(channels.createGetSetChannel("session-store:source").getAsync()).resolves.toBeNull();
    await expect(channels.createGetSetChannel("integration-stats:snapshot:v1:source").getAsync()).resolves.toBeNull();
    await expect(
      lock.setPersistentIfOwnedAsync(token, "integration-stats:snapshot:v1:source", "late", previous.fence),
    ).resolves.toBe(false);
    generations.stop();
  });

  test("a timed-out backing operation cannot commit later under the required abort contract", async () => {
    vi.useFakeTimers();
    const backing = createStateBackingFixture();
    let resume: (() => void) | undefined;
    const delayed = runStateOperationAsync(async (operation) => {
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      return await backing.mutateAsync(
        { conditions: [], writes: [{ kind: "set", key: "private", value: "late", ttlMs: null }], readKeys: [] },
        operation,
      );
    });
    const rejected = expect(delayed).rejects.toThrow("State operation timed out");
    await vi.advanceTimersByTimeAsync(500);
    await rejected;
    resume?.();
    await expect(createStateChannels(backing).createGetSetChannel("private").getAsync()).resolves.toBeNull();
  });
});
