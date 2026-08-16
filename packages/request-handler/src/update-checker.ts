import { Octokit } from "octokit";
import { compareSemVer, isValidSemVer, parseSemVer } from "semver-parser";

import { env } from "@homarr/common/env";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { createGetSetChannel, createLockChannel } from "@homarr/redis";

import packageJson from "../../../package.json";

const logger = createLogger({ module: "updateCheckerRequestHandler" });

const updateCheckTtlSeconds = 24 * 60 * 60;
const updateCheckLockTtlSeconds = 2 * 60;
const updateCheckWaitIntervalMs = 100;
const updateCheckWaitAttempts = 50;

type UpdateCheckCacheEntry = {
  availableUpdates: Update[];
  attemptedAt: number;
  checkedAt: number | null;
};

const updateCheckCacheVersion = `v2:${packageJson.version}`;
const freshUpdateCheckChannel = createGetSetChannel<UpdateCheckCacheEntry>(
  `update-checker:fresh:${updateCheckCacheVersion}`,
);
const staleUpdateCheckChannel = createGetSetChannel<UpdateCheckCacheEntry>(
  `update-checker:stale:${updateCheckCacheVersion}`,
);
const updateCheckLock = createLockChannel(`update-checker:lock:${updateCheckCacheVersion}`);

const waitAsync = async (durationMs: number) =>
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });

const waitForConcurrentUpdateCheckAsync = async () => {
  for (let attempt = 0; attempt < updateCheckWaitAttempts; attempt++) {
    await waitAsync(updateCheckWaitIntervalMs);
    const cached = await freshUpdateCheckChannel.getAsync();
    if (cached) return cached;
  }

  return await staleUpdateCheckChannel.getAsync();
};

const getCachedAvailableUpdatesAsync = async (): Promise<UpdateCheckCacheEntry> => {
  if (env.NO_EXTERNAL_CONNECTION) {
    return {
      availableUpdates: [],
      attemptedAt: Date.now(),
      checkedAt: null,
    };
  }

  const cached = await freshUpdateCheckChannel.getAsync();
  if (cached) return cached;

  const staleBeforeRefresh = await staleUpdateCheckChannel.getAsync();
  const lockToken = await updateCheckLock.acquireAsync(updateCheckLockTtlSeconds);
  if (!lockToken) {
    if (staleBeforeRefresh) return staleBeforeRefresh;
    const concurrentResult = await waitForConcurrentUpdateCheckAsync();
    if (concurrentResult) return concurrentResult;
    throw new Error("Timed out waiting for the update check");
  }

  try {
    const attemptedAt = Date.now();
    const availableUpdates = await getAvailableUpdatesAsync(packageJson.version);
    const result: UpdateCheckCacheEntry = {
      availableUpdates,
      attemptedAt,
      checkedAt: attemptedAt,
    };
    await staleUpdateCheckChannel.setAsync(result);
    await freshUpdateCheckChannel.setAsync(result, { ttlSeconds: updateCheckTtlSeconds });
    return result;
  } catch (error) {
    const stale = await staleUpdateCheckChannel.getAsync();
    const result: UpdateCheckCacheEntry = {
      availableUpdates: stale?.availableUpdates ?? [],
      attemptedAt: Date.now(),
      checkedAt: stale?.checkedAt ?? null,
    };
    await freshUpdateCheckChannel.setAsync(result, { ttlSeconds: updateCheckTtlSeconds });
    logger.warn("Failed to fetch available updates; suppressing retries for 24 hours", {
      error: error instanceof Error ? error.message : String(error),
      servingStale: stale !== null,
    });
    return result;
  } finally {
    try {
      await updateCheckLock.releaseAsync(lockToken);
    } catch (error) {
      logger.warn("Failed to release the update-check lock", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

export const updateCheckerRequestHandler = {
  handler: (_input: Record<string, never>) => ({
    getDataAsync: async () => {
      const result = await getCachedAvailableUpdatesAsync();
      return {
        data: { availableUpdates: result.availableUpdates },
        timestamp: new Date(result.checkedAt ?? result.attemptedAt),
      };
    },
  }),
};

interface Update {
  name: string | null;
  contentHtml?: string;
  url: string;
  tagName: string;
  isPrerelease: boolean;
}

const isPrereleaseTag = (tagName: string) => {
  try {
    const parsed = parseSemVer(tagName);
    return Boolean(parsed.pre?.length);
  } catch {
    return false;
  }
};

export const getAvailableUpdatesAsync = async (currentVersion: string) => {
  if (env.NO_EXTERNAL_CONNECTION) return [];

  if (!isValidSemVer(currentVersion)) {
    throw new ErrorWithMetadata("Unable to check for updates due to non semantic current version", {
      currentVersion,
    });
  }

  const octokit = new Octokit({
    request: {
      fetch: fetchWithTrustedCertificatesAsync,
    },
    throttle: { enabled: false },
  });

  const isCurrentPrerelease = isPrereleaseTag(currentVersion);

  const releases = await octokit.rest.repos.listReleases({
    owner: "homarr-labs",
    repo: "homarr",
  });

  const { skippedTags, semanticReleases } = releases.data
    .map((release) => ({
      name: release.name,
      contentHtml: release.body_html,
      url: release.html_url,
      tagName: release.tag_name,
      isPrerelease: release.prerelease,
    }))
    .reduce(
      (prev, curr) => {
        if (!isValidSemVer(curr.tagName)) {
          prev.skippedTags.push(curr.tagName);
          return prev;
        }

        prev.semanticReleases.push(curr);
        return prev;
      },
      { semanticReleases: [] as Update[], skippedTags: [] as string[] },
    );

  if (skippedTags.length > 0) {
    logger.warn(
      "Some releases were skipped during the update check because their tag name is not a valid semantic version",
      {
        skippedTags: skippedTags.join(","),
      },
    );
  }

  const availableUpdates = semanticReleases
    .filter((release) => isCurrentPrerelease || !release.isPrerelease)
    .filter((release) => compareSemVer(release.tagName, currentVersion) > 0)
    .toSorted((releaseA, releaseB) => compareSemVer(releaseB.tagName, releaseA.tagName));

  if (availableUpdates.length === 0) {
    logger.debug("No available updates found", { currentVersion });
    return [];
  }

  logger.info("Found available updates", {
    version: availableUpdates[0]?.tagName,
    count: availableUpdates.length,
    currentVersion,
  });

  return availableUpdates;
};
