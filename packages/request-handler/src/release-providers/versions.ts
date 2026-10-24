import { ReleaseLookupError } from "./errors";
import type { Release } from "./types";

export const floatingTagNames = ["latest", "release", "stable"];

const parseVersion = (tag: string) => tag.match(/\d+/g)?.map(Number) ?? [];

const compareVersionParts = (left: number[], right: number[]) => {
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? -1) - (right[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
};

export const byHighestVersion = (left: string, right: string) =>
  compareVersionParts(parseVersion(right), parseVersion(left));

export const isPlainVersionTag = (tag: string) => /^v?\d{1,4}(?:\.\d+)*$/.test(tag);

export const isVersionPrefixedTag = (tag: string) => /^v?\d+\.\d+/.test(tag);

export const isVersionLikeTag = (tag: string) => isPlainVersionTag(tag) || /\d+\.\d+/.test(tag);

export const byMostSpecificVersion = (left: string, right: string) =>
  Number(isPlainVersionTag(right)) - Number(isPlainVersionTag(left)) ||
  parseVersion(right).length - parseVersion(left).length ||
  left.length - right.length;

export const compileVersionPattern = (pattern?: string) => {
  if (!pattern) return undefined;
  try {
    return new RegExp(pattern);
  } catch {
    throw new ReleaseLookupError("noMatchingVersion", `Invalid regex: /${pattern}/`);
  }
};

export const matchesVersionPattern = (tag: string, versionPattern?: RegExp) =>
  !versionPattern || versionPattern.test(tag);

export const noMatchingVersionError = (tags: string[], versionPattern?: RegExp) => {
  const sample = `Sample tags: [${tags.slice(0, 5).join(", ")}]`;
  if (versionPattern) {
    return new ReleaseLookupError(
      "noMatchingVersion",
      `Regex /${versionPattern.source}/ matched 0/${tags.length} tags. ${sample}`,
    );
  }
  return new ReleaseLookupError("noMatchingVersion", `None of the ${tags.length} tags is a version. ${sample}`);
};

export const noReleasesFoundError = (identifier: string) =>
  new ReleaseLookupError("noReleasesFound", `${identifier} has no published releases`);

const byNewestRelease = (left: Release, right: Release) =>
  right.latestReleaseAt.getTime() - left.latestReleaseAt.getTime();

export const selectNewestRelease = (releases: Release[], versionPattern?: RegExp): Release => {
  const [newest] = releases
    .filter((release) => matchesVersionPattern(release.latestRelease, versionPattern))
    .toSorted(byNewestRelease);
  if (!newest) {
    throw noMatchingVersionError(
      releases.map((release) => release.latestRelease),
      versionPattern,
    );
  }
  return newest;
};
