import { z } from "zod/v4";

import { fetchJsonAsync, providerUrl } from "./http";
import { encodeOwnedName, parseOwnedName } from "./identifier";
import type { RegistryTag } from "./registry-tags";
import { selectRegistryRelease } from "./registry-tags";
import type { ReleaseProvider } from "./types";

const repositorySchema = z.object({
  description: z.string().nullish(),
  tags: z.record(
    z.string(),
    z.object({ name: z.string(), last_modified: z.string().nullish(), manifest_digest: z.string().nullish() }),
  ),
});

type QuayTag = z.infer<typeof repositorySchema>["tags"][string];

const toRegistryTags = (tag: QuayTag): RegistryTag[] => {
  if (!tag.last_modified) return [];
  return [{ name: tag.name, date: new Date(tag.last_modified), digest: tag.manifest_digest ?? undefined }];
};

export const getQuayReleaseAsync: ReleaseProvider = async (lookup) => {
  const repositoryPath = encodeOwnedName(parseOwnedName(lookup.identifier, "namespace/repository"));
  const repository = await fetchJsonAsync(
    providerUrl(lookup.baseUrl, `/api/v1/repository/${repositoryPath}?includeTags=true`),
    repositorySchema,
  );

  const release = selectRegistryRelease(Object.values(repository.tags).flatMap(toRegistryTags), lookup);
  const projectUrl = `https://quay.io/repository/${repositoryPath}`;
  return {
    projectUrl,
    projectDescription: repository.description ?? undefined,
    releaseUrl: `${projectUrl}/tag/${encodeURIComponent(release.latestRelease)}`,
    ...release,
  };
};
