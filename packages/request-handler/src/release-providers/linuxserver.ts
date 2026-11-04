import { z } from "zod/v4";

import { getReleaseProviderDefaultUrl } from "@homarr/definitions";

import { ReleaseLookupError } from "./errors";
import { getGithubReleaseAsync } from "./github";
import { fetchJsonAsync, providerUrl } from "./http";
import { parseGithubRepositoryUrl, parseOwnedName } from "./identifier";
import type { ProjectDetails, ReleaseProvider } from "./types";
import { matchesVersionPattern, noMatchingVersionError } from "./versions";

const imagesSchema = z.object({
  data: z.object({ repositories: z.object({ linuxserver: z.array(z.unknown()) }) }),
});

const imageNameSchema = z.object({ name: z.string() });

const imageSchema = z.object({
  name: z.string(),
  initial_date: z
    .string()
    .transform((value) => new Date(value))
    .nullish(),
  github_url: z.string().nullish(),
  description: z.string().nullish(),
  version: z.string(),
  version_timestamp: z.string().transform((value) => new Date(value)),
  stars: z.number().nullish(),
  deprecated: z.boolean().nullish(),
  changelog: z.array(z.object({ date: z.string(), desc: z.string() })).nullish(),
});

type LinuxServerImage = z.infer<typeof imageSchema>;

const findImage = (images: unknown[], name: string) => {
  const image = images.find((entry) => imageNameSchema.safeParse(entry).data?.name === name);
  if (!image) throw new ReleaseLookupError("notFound", `Image "${name}" is not in the LinuxServer.io registry`);
  return imageSchema.parse(image);
};

const describeImage = (image: LinuxServerImage): ProjectDetails => ({
  projectUrl: image.github_url ?? undefined,
  projectDescription: image.description ?? undefined,
  isArchived: image.deprecated ?? undefined,
  starsCount: image.stars ?? undefined,
  createdAt: image.initial_date ?? undefined,
});

const getGithubHistoryReleaseAsync = async (image: LinuxServerImage, versionPattern: RegExp) => {
  const githubRepository = parseGithubRepositoryUrl(image.github_url);
  if (!githubRepository) throw noMatchingVersionError([image.version], versionPattern);

  const release = await getGithubReleaseAsync({
    baseUrl: getReleaseProviderDefaultUrl("github"),
    identifier: githubRepository,
    versionPattern,
  });
  const details = describeImage(image);
  return { ...release, ...details, createdAt: details.createdAt ?? release.createdAt };
};

export const getLinuxServerReleaseAsync: ReleaseProvider = async ({ baseUrl, identifier, versionPattern }) => {
  const { name } = parseOwnedName(identifier, "linuxserver/image");
  const { data } = await fetchJsonAsync(providerUrl(baseUrl, "/api/v1/images"), imagesSchema);
  const image = findImage(data.repositories.linuxserver, name);

  if (versionPattern && !matchesVersionPattern(image.version, versionPattern)) {
    return await getGithubHistoryReleaseAsync(image, versionPattern);
  }

  return {
    latestRelease: image.version,
    latestReleaseAt: image.version_timestamp,
    releaseDescription: image.changelog?.[0]?.desc,
    ...describeImage(image),
  };
};
