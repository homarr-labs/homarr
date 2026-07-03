import { Octokit } from "octokit";
import { compareSemVer, isValidSemVer, parseSemVer } from "semver-parser";

import { env } from "@homarr/common/env";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import { createRequestHandler } from "./lib/request-handler";

import packageJson from "../../../package.json";

const logger = createLogger({ module: "updateCheckerRequestHandler" });

export const updateCheckerRequestHandler = createRequestHandler({
  async requestAsync(_) {
    const availableUpdates = await getAvailableUpdatesAsync(packageJson.version);
    return { availableUpdates };
  },
  cacheTtlMs: 30 * 60 * 1000,
});

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
