import type { Release, ReleaseLookup } from "./types";
import {
  byHighestVersion,
  byMostSpecificVersion,
  floatingTagNames,
  isPlainVersionTag,
  isVersionLikeTag,
  noMatchingVersionError,
  noReleasesFoundError,
} from "./versions";

export interface RegistryTag {
  name: string;
  date: Date;
  digest?: string;
}

const tagTime = (tag: { date?: Date }) => tag.date?.getTime() ?? 0;

export const pickHighestVersionTag = <TTag extends { name: string; date?: Date }>(tags: TTag[]) =>
  tags.toSorted((left, right) => byHighestVersion(left.name, right.name) || tagTime(right) - tagTime(left))[0];

export const pickMostSpecificVersionTag = <TTag extends { name: string }>(tags: TTag[]) =>
  tags
    .filter((tag) => isVersionLikeTag(tag.name))
    .toSorted((left, right) => byMostSpecificVersion(left.name, right.name))[0];

export const findFloatingTag = <TTag extends { name: string }>(tags: TTag[]) =>
  floatingTagNames.map((name) => tags.find((tag) => tag.name === name)).find((tag) => tag !== undefined);

const pickNewestTag = (tags: RegistryTag[]) => tags.toSorted((left, right) => tagTime(right) - tagTime(left))[0];

const releaseFromTag = (tag: RegistryTag): Release => ({ latestRelease: tag.name, latestReleaseAt: tag.date });

const selectMatchingTag = (tags: RegistryTag[], versionPattern: RegExp) => {
  const tag = pickHighestVersionTag(tags.filter((candidate) => versionPattern.test(candidate.name)));
  if (!tag) {
    throw noMatchingVersionError(
      tags.map((candidate) => candidate.name),
      versionPattern,
    );
  }
  return releaseFromTag(tag);
};

const findDigestSibling = (floatingTag: RegistryTag, tags: RegistryTag[]) => {
  if (!floatingTag.digest) return undefined;
  return pickMostSpecificVersionTag(
    tags.filter((tag) => tag.name !== floatingTag.name && tag.digest === floatingTag.digest),
  );
};

const resolveFloatingTag = (floatingTag: RegistryTag, tags: RegistryTag[]): Release => {
  const versionTag = findDigestSibling(floatingTag, tags);
  if (!versionTag) return releaseFromTag(floatingTag);
  return { latestRelease: versionTag.name, latestReleaseAt: floatingTag.date, resolvedFromTag: floatingTag.name };
};

export const selectRegistryRelease = (
  tags: RegistryTag[],
  { identifier, versionPattern }: Pick<ReleaseLookup, "identifier" | "versionPattern">,
): Release => {
  const newestTag = pickNewestTag(tags);
  if (!newestTag) throw noReleasesFoundError(identifier);
  if (versionPattern) return selectMatchingTag(tags, versionPattern);

  const floatingTag = findFloatingTag(tags);
  if (floatingTag) return resolveFloatingTag(floatingTag, tags);

  return releaseFromTag(pickHighestVersionTag(tags.filter((tag) => isPlainVersionTag(tag.name))) ?? newestTag);
};
