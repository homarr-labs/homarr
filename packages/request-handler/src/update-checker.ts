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

const releasesPerPage = 100;
const maxRecentReleases = 10;

type UpdateCheckCacheEntry = {
  availableUpdates: Update[];
  recentReleases: Release[];
  attemptedAt: number;
  checkedAt: number | null;
};

const updateCheckCacheVersion = `v3:${packageJson.version}`;
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

const getCachedUpdateCheckAsync = async (): Promise<UpdateCheckCacheEntry> => {
  if (env.NO_EXTERNAL_CONNECTION) {
    return {
      availableUpdates: [],
      recentReleases: [],
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
    const { availableUpdates, recentReleases } = await getReleaseSummaryAsync(packageJson.version);
    const result: UpdateCheckCacheEntry = {
      availableUpdates,
      recentReleases,
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
      recentReleases: stale?.recentReleases ?? [],
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
      const result = await getCachedUpdateCheckAsync();
      return {
        data: { availableUpdates: result.availableUpdates, recentReleases: result.recentReleases },
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

interface Release extends Update {
  body: string;
  publishedAt: Date;
}

interface ReleaseSummary {
  availableUpdates: Update[];
  recentReleases: Release[];
}

const toUpdate = ({ name, contentHtml, url, tagName, isPrerelease }: Release): Update => ({
  name,
  contentHtml,
  url,
  tagName,
  isPrerelease,
});

const isPrereleaseTag = (tagName: string) => {
  try {
    const parsed = parseSemVer(tagName);
    return Boolean(parsed.pre?.length);
  } catch {
    return false;
  }
};

const selectRecentReleases = (releases: Release[], currentVersion: string) => {
  if (isPrereleaseTag(currentVersion)) return [];

  return releases
    .filter((release) => !release.isPrerelease && !isPrereleaseTag(release.tagName))
    .filter((release) => compareSemVer(release.tagName, currentVersion) <= 0)
    .toSorted((releaseA, releaseB) => compareSemVer(releaseB.tagName, releaseA.tagName))
    .slice(0, maxRecentReleases);
};

export const selectUnseenReleases = (
  recentReleases: Release[],
  currentVersion: string,
  lastSeenVersion: string | null,
) => {
  if (lastSeenVersion === null || !isValidSemVer(lastSeenVersion)) {
    return recentReleases.filter((release) => compareSemVer(release.tagName, currentVersion) === 0);
  }

  return recentReleases.filter(
    (release) =>
      compareSemVer(release.tagName, lastSeenVersion) > 0 && compareSemVer(release.tagName, currentVersion) <= 0,
  );
};

export const getAvailableUpdatesAsync = async (currentVersion: string) => {
  const { availableUpdates } = await getReleaseSummaryAsync(currentVersion);
  return availableUpdates;
};

const getReleaseSummaryAsync = async (currentVersion: string): Promise<ReleaseSummary> => {
  if (env.NO_EXTERNAL_CONNECTION) return { availableUpdates: [], recentReleases: [] };

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
    per_page: releasesPerPage,
  });

  const { skippedTags, semanticReleases } = releases.data
    .map((release) => ({
      name: release.name,
      contentHtml: release.body_html,
      body: release.body ?? "",
      publishedAt: new Date(release.published_at ?? release.created_at),
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
      { semanticReleases: [] as Release[], skippedTags: [] as string[] },
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
    .toSorted((releaseA, releaseB) => compareSemVer(releaseB.tagName, releaseA.tagName))
    .map(toUpdate);

  const recentReleases = selectRecentReleases(semanticReleases, currentVersion);

  if (availableUpdates.length === 0) {
    logger.debug("No available updates found", { currentVersion });
    return { availableUpdates, recentReleases };
  }

  logger.info("Found available updates", {
    version: availableUpdates[0]?.tagName,
    count: availableUpdates.length,
    currentVersion,
  });

  return { availableUpdates, recentReleases };
};
