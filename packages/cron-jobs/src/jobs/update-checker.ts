import { Octokit } from "octokit";
import { compareSemVer, isValidSemVer } from "semver-parser";

import { EVERY_HOUR } from "@homarr/cron-jobs-core/expressions";
import { logger } from "@homarr/log";
import { createSubPubChannel } from "@homarr/redis";

import packageJson from "../../../../package.json";
import { createCronJob } from "../lib";

export const updateCheckerJob = createCronJob("updateChecker", EVERY_HOUR, {
  runOnStart: true,
}).withCallback(async () => {
  const octokit = new Octokit();
  const releases = await octokit.rest.repos.listReleases({
    owner: "homarr-labs",
    repo: "homarr",
  });

  const currentVersion = (packageJson as { version: string }).version;
  const availableReleases = [];

  for (const release of releases.data) {
    if (!isValidSemVer(release.tag_name)) {
      logger.warn(`Unable to parse semantic tag '${release.tag_name}'. Update check might not work.`);
      continue;
    }

    availableReleases.push(release);
  }

  const availableNewerReleases = availableReleases
    .filter((release) => compareSemVer(release.tag_name, currentVersion) > 0)
    .sort((releaseA, releaseB) => compareSemVer(releaseB.tag_name, releaseA.tag_name));
  if (availableReleases.length > 0) {
    logger.info(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      `Update checker found a new available version: ${availableReleases[0]!.tag_name}. Current version is ${currentVersion}`,
    );
  } else {
    logger.debug(`Update checker did not find any available updates. Current version is ${currentVersion}`);
  }

  const channel = createSubPubChannel<{
    availableUpdates: { name: string | null; contentHtml?: string; url: string; tag_name: string }[];
  }>("homarr:update", {
    persist: true,
  });

  await channel.publishAsync({
    availableUpdates: availableNewerReleases.map((release) => ({
      name: release.name,
      contentHtml: release.body_html,
      url: release.html_url,
      tag_name: release.tag_name,
    })),
  });
});
