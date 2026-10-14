import { stringify } from "superjson";

import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { BackendContext } from "../../context";
import type { Update, UpdateCheckCacheEntry, UpdateCheckerProcedureResources } from "./resources";

const updateCheckTtlMs = 24 * 60 * 60 * 1000;
const updateCheckLockTtlSeconds = 2 * 60;
const updateCheckWaitIntervalMs = 100;
const updateCheckWaitAttempts = 50;

export async function getAvailableUpdatesAsync(
  resources: UpdateCheckerProcedureResources,
  currentVersion: string,
  signal: AbortSignal,
): Promise<Update[]> {
  signal.throwIfAborted();
  if (!resources.isExternalConnectionAllowed()) return [];
  const { isValidSemVer, parseSemVer, compareSemVer } = resources.semver;
  if (!isValidSemVer(currentVersion)) {
    throw new ErrorWithMetadata("Unable to check for updates due to non semantic current version", {
      currentVersion,
    });
  }
  const octokit = new resources.Octokit({
    request: {
      fetch: (url, options) => {
        signal.throwIfAborted();
        if (!resources.isExternalConnectionAllowed()) throw new Error("External connections are disabled");
        const requestSignal = options?.signal ? AbortSignal.any([signal, options.signal]) : signal;
        return resources.fetchWithTrustedCertificatesAsync(url, { ...options, signal: requestSignal });
      },
    },
    throttle: { enabled: false },
  });
  let isCurrentPrerelease = false;
  try {
    isCurrentPrerelease = Boolean(parseSemVer(currentVersion).pre?.length);
  } catch {
    isCurrentPrerelease = false;
  }
  const releases = await octokit.rest.repos.listReleases({
    owner: "homarr-labs",
    repo: "homarr",
    request: { signal },
  });
  signal.throwIfAborted();
  if (!resources.isExternalConnectionAllowed()) return [];
  const { skippedTags, semanticReleases } = releases.data
    .map((release) => ({
      name: release.name,
      contentHtml: release.body_html,
      url: release.html_url,
      tagName: release.tag_name,
      isPrerelease: release.prerelease,
    }))
    .reduce<{ semanticReleases: Update[]; skippedTags: string[] }>(
      (previous, current) => {
        if (!isValidSemVer(current.tagName)) {
          previous.skippedTags.push(current.tagName);
          return previous;
        }
        previous.semanticReleases.push(current);
        return previous;
      },
      { semanticReleases: [], skippedTags: [] },
    );
  if (skippedTags.length > 0) {
    resources.logger.warn(
      "Some releases were skipped during the update check because their tag name is not a valid semantic version",
      { skippedTags: skippedTags.join(",") },
    );
  }
  const availableUpdates = semanticReleases
    .filter((release) => isCurrentPrerelease || !release.isPrerelease)
    .filter((release) => compareSemVer(release.tagName, currentVersion) > 0)
    .toSorted((releaseA, releaseB) => compareSemVer(releaseB.tagName, releaseA.tagName));
  if (availableUpdates.length === 0) {
    resources.logger.debug("No available updates found", { currentVersion });
    return [];
  }
  resources.logger.info("Found available updates", {
    version: availableUpdates[0]?.tagName,
    count: availableUpdates.length,
    currentVersion,
  });
  return availableUpdates;
}

export function createUpdateCheckerRequest(resources: UpdateCheckerProcedureResources, context: BackendContext) {
  const controller = new AbortController();
  const signal = AbortSignal.any([context.signal, controller.signal]);
  const channels = resources.state.createChannels(signal);
  const cleanupChannels = resources.state.createChannels();
  const version = `v2:${resources.currentVersion}`;
  const freshName = `update-checker:fresh:${version}`;
  const staleName = `update-checker:stale:${version}`;
  const lockName = `update-checker:lock:${version}`;
  const fresh = channels.createGetSetChannel<UpdateCheckCacheEntry>(freshName);
  const stale = channels.createGetSetChannel<UpdateCheckCacheEntry>(staleName);
  const lock = channels.createLockChannel(lockName);
  const cleanupLock = cleanupChannels.createLockChannel(lockName);
  let stopped = false;
  const pending = new Set<Promise<{ data: { availableUpdates: Update[] }; timestamp: Date }>>();

  const assertActive = () => {
    if (stopped) throw new Error("Update state service is stopped");
    signal.throwIfAborted();
  };
  const emptyResult = (): UpdateCheckCacheEntry => ({
    availableUpdates: [],
    attemptedAt: resources.clock.now(),
    checkedAt: null,
  });
  const applyPolicy = (result: UpdateCheckCacheEntry) => {
    assertActive();
    return resources.isExternalConnectionAllowed() ? result : emptyResult();
  };
  const waitForConcurrentUpdateCheckAsync = async () => {
    for (let attempt = 0; attempt < updateCheckWaitAttempts; attempt++) {
      await resources.clock.waitAsync(updateCheckWaitIntervalMs, signal);
      assertActive();
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
      const cached = await fresh.getAsync();
      assertActive();
      if (cached) return applyPolicy(cached);
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
    }
    const previous = await stale.getAsync();
    assertActive();
    if (!resources.isExternalConnectionAllowed()) return emptyResult();
    return previous ? applyPolicy(previous) : null;
  };
  const getCachedAvailableUpdatesAsync = async (): Promise<UpdateCheckCacheEntry> => {
    assertActive();
    if (!resources.isExternalConnectionAllowed()) return emptyResult();
    const cached = await fresh.getAsync();
    assertActive();
    if (cached) return applyPolicy(cached);
    if (!resources.isExternalConnectionAllowed()) return emptyResult();
    const staleBeforeRefresh = await stale.getAsync();
    assertActive();
    if (!resources.isExternalConnectionAllowed()) return emptyResult();
    const token = await lock.acquireAsync(updateCheckLockTtlSeconds);
    if (!token) {
      assertActive();
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
      if (staleBeforeRefresh) return applyPolicy(staleBeforeRefresh);
      const concurrent = await waitForConcurrentUpdateCheckAsync();
      if (concurrent) return applyPolicy(concurrent);
      assertActive();
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
      throw new Error("Timed out waiting for the update check");
    }
    try {
      assertActive();
      const attemptedAt = resources.clock.now();
      let availableUpdates: Update[];
      try {
        if (!resources.isExternalConnectionAllowed()) return emptyResult();
        availableUpdates = await getAvailableUpdatesAsync(resources, resources.currentVersion, signal);
      } catch (error) {
        assertActive();
        if (!resources.isExternalConnectionAllowed()) return emptyResult();
        const previous = await stale.getAsync();
        assertActive();
        const result: UpdateCheckCacheEntry = {
          availableUpdates: previous?.availableUpdates ?? [],
          attemptedAt: resources.clock.now(),
          checkedAt: previous?.checkedAt ?? null,
        };
        if (!resources.isExternalConnectionAllowed()) return emptyResult();
        if (!(await lock.setIfOwnedAsync(token, freshName, result, updateCheckTtlMs))) {
          throw new Error("Update refresh ownership expired", { cause: error });
        }
        assertActive();
        resources.diagnostics.warn(
          "Failed to fetch available updates; suppressing retries for 24 hours",
          { servingStale: previous !== null },
          error,
        );
        return applyPolicy(result);
      }
      assertActive();
      const result: UpdateCheckCacheEntry = { availableUpdates, attemptedAt, checkedAt: attemptedAt };
      if (!resources.isExternalConnectionAllowed()) return emptyResult();
      const stored = await lock.setManyIfOwnedAsync(token, [
        { kind: "set", key: staleName, value: stringify(result), ttlMs: null },
        { kind: "set", key: freshName, value: stringify(result), ttlMs: updateCheckTtlMs },
      ]);
      assertActive();
      if (!stored) throw new Error("Update refresh ownership expired");
      return applyPolicy(result);
    } finally {
      try {
        await cleanupLock.releaseAsync(token);
      } catch (error) {
        resources.diagnostics.warn("Failed to release the update-check lock", {}, error);
      }
    }
  };
  const getDataAsync = () => {
    assertActive();
    const operation = getCachedAvailableUpdatesAsync()
      .catch((error: unknown) => {
        assertActive();
        if (!resources.isExternalConnectionAllowed()) return emptyResult();
        throw error;
      })
      .then((cached) => {
        const result = applyPolicy(cached);
        return {
          data: { availableUpdates: result.availableUpdates },
          timestamp: new Date(result.checkedAt ?? result.attemptedAt),
        };
      });
    pending.add(operation);
    void operation.then(
      () => pending.delete(operation),
      () => pending.delete(operation),
    );
    return operation;
  };
  const stopAsync = async () => {
    stopped = true;
    controller.abort(new Error("Update state service is stopped"));
    await Promise.allSettled(pending);
  };
  context.onDispose(stopAsync);
  return {
    handler: (_input: Record<string, never>) => ({ getDataAsync }),
    assertActive,
    stopAsync,
  };
}
