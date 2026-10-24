import type { OwnedName } from "./identifier";
import { parseGithubRepositoryUrl, parseOwnedPackageName } from "./identifier";
import type { OciImage } from "./oci-registry";
import { OciRegistry } from "./oci-registry";
import { pickHighestVersionTag } from "./registry-tags";
import type { Release, ReleaseProvider } from "./types";
import {
  byHighestVersion,
  floatingTagNames,
  isPlainVersionTag,
  isVersionLikeTag,
  isVersionPrefixedTag,
  noMatchingVersionError,
  noReleasesFoundError,
} from "./versions";

const MAX_DIGEST_CANDIDATES = 5;

const imageLabels = {
  version: "org.opencontainers.image.version",
  source: "org.opencontainers.image.source",
  description: "org.opencontainers.image.description",
};

interface ResolvedImage {
  image: OciImage;
  version?: string;
}

const isBuildLabel = (label: string) => !isVersionLikeTag(label) && /\d/.test(label);

const findLabelVersionAsync = async (
  registry: OciRegistry,
  image: OciImage,
  digest: string,
  isUsableLabel: (label: string) => boolean,
) => {
  const labelVersion = image.labels[imageLabels.version];
  if (labelVersion === undefined || labelVersion === image.tag || !isUsableLabel(labelVersion)) return undefined;

  const labelTags = [labelVersion, ...floatingTagNames.map((tag) => `${tag}-${labelVersion}`)];
  if (await registry.findTagWithDigestAsync(labelTags, digest)) return labelVersion;
  return undefined;
};

const findVersionTagWithDigestAsync = async (registry: OciRegistry, digest: string) => {
  const versionTags = (await registry.listTagsAsync())
    .filter(isPlainVersionTag)
    .toSorted(byHighestVersion)
    .slice(0, MAX_DIGEST_CANDIDATES);
  return await registry.findTagWithDigestAsync(versionTags, digest);
};

const findFloatingVersionAsync = async (registry: OciRegistry, image: OciImage) => {
  if (!image.digest) return undefined;
  return (
    (await findLabelVersionAsync(registry, image, image.digest, isVersionLikeTag)) ??
    (await findVersionTagWithDigestAsync(registry, image.digest)) ??
    (await findLabelVersionAsync(registry, image, image.digest, isBuildLabel))
  );
};

const toTagCandidates = (tags: string[]) => tags.toReversed().map((name) => ({ name }));

const imageTime = (image: OciImage) => image.createdAt?.getTime() ?? 0;

const findVersionImageNotOlderThanAsync = async (registry: OciRegistry, floatingImage: OciImage) => {
  const tag = pickHighestVersionTag(toTagCandidates((await registry.listTagsAsync()).filter(isPlainVersionTag)));
  if (!tag) return undefined;
  const image = await registry.getImageAsync(tag.name);
  if (imageTime(image) < imageTime(floatingImage)) return undefined;
  return image;
};

const resolveFloatingImageAsync = async (registry: OciRegistry, image: OciImage): Promise<ResolvedImage> => {
  const version = await findFloatingVersionAsync(registry, image);
  if (version) return { image, version };
  return { image: (await findVersionImageNotOlderThanAsync(registry, image)) ?? image };
};

const releaseTagTiers = [isPlainVersionTag, isVersionPrefixedTag, isVersionLikeTag];

const pickReleaseTag = (tags: string[]) =>
  releaseTagTiers
    .map((isInTier) => pickHighestVersionTag(toTagCandidates(tags.filter(isInTier))))
    .find((tag) => tag !== undefined);

const findNewestImageAsync = async (registry: OciRegistry, tags: string[]) => {
  const images = await Promise.all(tags.slice(-MAX_DIGEST_CANDIDATES).map((tag) => registry.getImageAsync(tag)));
  return images.toSorted((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0))[0];
};

const resolveTaggedImageAsync = async (
  registry: OciRegistry,
  identifier: string,
  versionPattern?: RegExp,
): Promise<ResolvedImage> => {
  const tags = await registry.listTagsAsync();
  if (tags.length === 0) throw noReleasesFoundError(identifier);

  if (versionPattern) {
    const tag = pickHighestVersionTag(toTagCandidates(tags.filter((name) => versionPattern.test(name))));
    if (!tag) throw noMatchingVersionError(tags, versionPattern);
    return { image: await registry.getImageAsync(tag.name) };
  }

  const tag = pickReleaseTag(tags);
  if (tag) return { image: await registry.getImageAsync(tag.name) };

  const newestImage = await findNewestImageAsync(registry, tags);
  if (!newestImage) throw noReleasesFoundError(identifier);
  return { image: newestImage };
};

const resolveImageAsync = async (registry: OciRegistry, identifier: string, versionPattern?: RegExp) => {
  if (versionPattern) return await resolveTaggedImageAsync(registry, identifier, versionPattern);

  const floatingImage = await registry.findFloatingImageAsync();
  if (floatingImage) return await resolveFloatingImageAsync(registry, floatingImage);
  return await resolveTaggedImageAsync(registry, identifier);
};

const toRelease = ({ image, version }: ResolvedImage): Release => {
  const latestReleaseAt = image.createdAt ?? new Date();
  if (!version) return { latestRelease: image.tag, latestReleaseAt };
  return { latestRelease: version, latestReleaseAt, resolvedFromTag: image.tag };
};

const describeProject = (repository: OwnedName, labels: Record<string, string>) => {
  const sourceRepository = parseGithubRepositoryUrl(labels[imageLabels.source]);
  const projectUrl = `https://github.com/${sourceRepository ?? `${repository.owner}/${repository.name}`}`;
  return {
    projectUrl,
    projectDescription: labels[imageLabels.description],
    releaseUrl: `${projectUrl}/pkgs/container/${encodeURIComponent(repository.name)}`,
  };
};

export const getGitHubContainerRegistryReleaseAsync: ReleaseProvider = async ({
  baseUrl,
  identifier,
  versionPattern,
  token,
}) => {
  const repository = parseOwnedPackageName(identifier, "owner/package");
  const registry = await OciRegistry.connectAsync(baseUrl, `${repository.owner}/${repository.name}`, token);
  const resolved = await resolveImageAsync(registry, identifier, versionPattern);
  return { ...describeProject(repository, resolved.image.labels), ...toRelease(resolved) };
};
