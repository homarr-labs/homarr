import { stringify } from "superjson";

import type { StateChannels, StateDiagnostics } from "@homarr/redis/state";

interface UpdateCheckCacheEntry<TUpdate> {
  availableUpdates: TUpdate[];
  attemptedAt: number;
  checkedAt: number | null;
}

export interface UpdateStateResources<TUpdate> {
  channels: StateChannels;
  diagnostics: StateDiagnostics;
  currentVersion: string;
  isExternalConnectionAllowed(): boolean;
  getAvailableUpdatesAsync(currentVersion: string): Promise<TUpdate[]>;
}

const UPDATE_TTL_MS = 24 * 60 * 60 * 1000;
const LOCK_TTL_SECONDS = 2 * 60;
const WAIT_INTERVAL_MS = 100;
const WAIT_ATTEMPTS = 50;

const createDeniedUpdateResult = <TUpdate>(): UpdateCheckCacheEntry<TUpdate> => ({
  availableUpdates: [],
  attemptedAt: Date.now(),
  checkedAt: null,
});

export const createUpdateStateService = <TUpdate>(resources: UpdateStateResources<TUpdate>) => {
  const version = `v2:${resources.currentVersion}`;
  const freshName = `update-checker:fresh:${version}`;
  const staleName = `update-checker:stale:${version}`;
  const fresh = resources.channels.createGetSetChannel<UpdateCheckCacheEntry<TUpdate>>(freshName);
  const stale = resources.channels.createGetSetChannel<UpdateCheckCacheEntry<TUpdate>>(staleName);
  const lock = resources.channels.createLockChannel(`update-checker:lock:${version}`);
  let stopped = false;

  const assertActive = () => {
    if (stopped) throw new Error("Update state service is stopped");
  };

  const emptyResult = createDeniedUpdateResult<TUpdate>;
  const applyPolicy = (result: UpdateCheckCacheEntry<TUpdate>) =>
    resources.isExternalConnectionAllowed() ? result : emptyResult();

  const waitForConcurrentUpdateCheckAsync = async () => {
    for (let attempt = 0; attempt < WAIT_ATTEMPTS; attempt++) {
      await new Promise<void>((resolve) => setTimeout(resolve, WAIT_INTERVAL_MS));
      assertActive();
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
      const cached = await fresh.getAsync();
      if (cached) return applyPolicy(cached);
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
    }
    const previous = await stale.getAsync();
    if (!resources.isExternalConnectionAllowed()) return emptyResult();
    return previous ? applyPolicy(previous) : null;
  };

  const getCachedAvailableUpdatesAsync = async (): Promise<UpdateCheckCacheEntry<TUpdate>> => {
    assertActive();
    if (!resources.isExternalConnectionAllowed()) return emptyResult();
    const cached = await fresh.getAsync();
    if (cached) return applyPolicy(cached);
    if (!resources.isExternalConnectionAllowed()) return emptyResult();
    const staleBeforeRefresh = await stale.getAsync();
    if (!resources.isExternalConnectionAllowed()) return emptyResult();
    const token = await lock.acquireAsync(LOCK_TTL_SECONDS);
    if (!token) {
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
      if (staleBeforeRefresh) return applyPolicy(staleBeforeRefresh);
      const concurrent = await waitForConcurrentUpdateCheckAsync();
      if (concurrent) return applyPolicy(concurrent);
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
      throw new Error("Timed out waiting for the update check");
    }
    try {
      const attemptedAt = Date.now();
      let availableUpdates: TUpdate[];
      try {
        if (!resources.isExternalConnectionAllowed()) return emptyResult();
        availableUpdates = await resources.getAvailableUpdatesAsync(resources.currentVersion);
      } catch (error) {
        assertActive();
        if (!resources.isExternalConnectionAllowed()) return emptyResult();
        const previous = await stale.getAsync();
        const result: UpdateCheckCacheEntry<TUpdate> = {
          availableUpdates: previous?.availableUpdates ?? [],
          attemptedAt: Date.now(),
          checkedAt: previous?.checkedAt ?? null,
        };
        if (!resources.isExternalConnectionAllowed()) return emptyResult();
        if (!(await lock.setIfOwnedAsync(token, freshName, result, UPDATE_TTL_MS)))
          throw new Error("Update refresh ownership expired", { cause: error });
        resources.diagnostics.warn(
          "Failed to fetch available updates; suppressing retries for 24 hours",
          {
            servingStale: previous !== null,
          },
          error,
        );
        return applyPolicy(result);
      }
      assertActive();
      const result: UpdateCheckCacheEntry<TUpdate> = { availableUpdates, attemptedAt, checkedAt: attemptedAt };
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
      const stored = await lock.setManyIfOwnedAsync(token, [
        { kind: "set", key: staleName, value: stringify(result), ttlMs: null },
        { kind: "set", key: freshName, value: stringify(result), ttlMs: UPDATE_TTL_MS },
      ]);
      if (!stored) throw new Error("Update refresh ownership expired");
      return applyPolicy(result);
    } finally {
      try {
        await lock.releaseAsync(token);
      } catch (error) {
        resources.diagnostics.warn("Failed to release the update-check lock", {}, error);
      }
    }
  };

  return {
    handler: (_input: Record<string, never>) => ({
      getDataAsync: async () => {
        const cached = await getCachedAvailableUpdatesAsync().catch((error: unknown) => {
          assertActive();
          if (!resources.isExternalConnectionAllowed()) return emptyResult();
          throw error;
        });
        assertActive();
        const result = applyPolicy(cached);
        return {
          data: { availableUpdates: result.availableUpdates },
          timestamp: new Date(result.checkedAt ?? result.attemptedAt),
        };
      },
    }),
    stop: () => {
      stopped = true;
    },
  };
};
