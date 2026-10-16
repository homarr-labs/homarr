// @vitest-environment node

import { beforeAll, describe, expect, test, vi } from "vitest";

vi.hoisted(() => {
  process.env.HOMARR_STATE_BACKEND = "memory";
  process.env.DISABLE_REDIS_LOGS = "1";
});

import { getMemoryStateStore } from "@homarr/core/infrastructure/redis";

import { createIntegrationSharedCacheAsync } from "../../../request-handler/src/lib/shared-cache";

import {
  createGetSetChannel,
  createLockChannel,
  createSubPubChannel,
  getIntegrationCacheGenerationAsync,
  getIntegrationSessionStoreKey,
  getWidgetCacheGenerationAsync,
  invalidateIntegrationCacheAsync,
  invalidateIntegrationResponseCacheAsync,
  invalidateWidgetCache,
  prepareIntegrationResponseCacheAsync,
} from "./channel";

describe("real channels using local state", () => {
  beforeAll(async () => {
    await prepareIntegrationResponseCacheAsync();
  });

  test("integration invalidation evicts sessions and advances every subsequent cache read", async () => {
    const id = "local-integration";
    const session = createGetSetChannel<string>(getIntegrationSessionStoreKey(id));
    await session.setAsync("old-secret");
    const initial = await getIntegrationCacheGenerationAsync(id);
    expect(initial.isShared).toBe(true);
    await invalidateIntegrationCacheAsync(id);
    expect(await session.getAsync()).toBeNull();
    const updated = await getIntegrationCacheGenerationAsync(id);
    expect(updated.isShared).toBe(true);
    expect(updated.value).not.toBe(initial.value);
    await session.setAsync("new-secret");
    await invalidateIntegrationResponseCacheAsync(id);
    expect(await session.getAsync()).toBe("new-secret");
    expect((await getIntegrationCacheGenerationAsync(id)).value).not.toBe(updated.value);
  });

  test("widget invalidation fences reads immediately while generation advance settles", async () => {
    const initial = await getWidgetCacheGenerationAsync("local-widget");
    invalidateWidgetCache("local-widget");
    const updated = await getWidgetCacheGenerationAsync("local-widget");
    expect(updated.value).not.toBe(initial.value);
  });

  test("request-cache locks commit only while the current token owns the lease", async () => {
    const lock = createLockChannel("local-request-lock", { useBoundedCacheClient: true });
    const payload = createGetSetChannel("local-request-payload", { useBoundedCacheClient: true });
    const acquisitions = await Promise.all(Array.from({ length: 20 }, () => lock.acquireAsync(60)));
    const owners = acquisitions.filter((token): token is string => token !== null);
    expect(owners).toHaveLength(1);
    const token = owners[0];
    if (!token) throw new Error("Missing owner token");
    expect(await lock.setIfOwnedAsync("intruder", "local-request-payload", { value: "stale" }, 1000)).toBe(false);
    expect(await lock.setIfOwnedAsync(token, "local-request-payload", { value: "fresh" }, 1000)).toBe(true);
    expect(await payload.getAsync()).toEqual({ value: "fresh" });
    await lock.releaseAsync(token);
    expect(await lock.setIfOwnedAsync(token, "local-request-payload", { value: "stale" }, 1000)).toBe(false);
  });

  test("pubsub cleanup prevents both live and deferred replay delivery after unsubscribe", async () => {
    const channel = createSubPubChannel<number>("local-pubsub");
    await channel.publishAsync(1);
    const messages: number[] = [];
    const baseline = getMemoryStateStore().stats.subscriptions;
    const unsubscribe = channel.subscribe((message) => {
      messages.push(message);
    });
    unsubscribe();
    await Promise.resolve();
    await channel.publishAsync(2);
    expect(messages).toEqual([]);
    expect(getMemoryStateStore().stats.subscriptions).toBe(baseline);
    const unsubscribeNext = channel.subscribe((message) => {
      messages.push(message);
    });
    await Promise.resolve();
    await channel.publishAsync(3);
    expect(messages).toContain(3);
    unsubscribeNext();
  });

  test("actual integration request cache shares refresh ownership and fences invalidated payloads", async () => {
    const options = { namespace: "local-request", integrationId: "request-cache", cacheIdentity: "same-input" };
    const one = await createIntegrationSharedCacheAsync<string>(options);
    const two = await createIntegrationSharedCacheAsync<string>(options);
    const token = await one.acquireRefreshLockAsync();
    expect(typeof token).toBe("string");
    if (!token) throw new Error("Missing refresh token");
    expect(await two.acquireRefreshLockAsync()).toBeNull();
    const now = Date.now();
    const entry = { data: "current", timestamp: new Date(now), expiresAt: now + 1000, staleUntil: now + 2000 };
    expect(await one.setAsync(entry, token)).toBe(true);
    expect(await two.getAsync()).toEqual(entry);
    await invalidateIntegrationCacheAsync(options.integrationId);
    const after = await createIntegrationSharedCacheAsync<string>(options);
    expect(after.generation).not.toBe(one.generation);
    expect(await after.getAsync()).toBeNull();
    await one.releaseRefreshLockAsync(token);
    expect(await one.setAsync({ ...entry, data: "stale" }, token)).toBe(false);
  });
});
