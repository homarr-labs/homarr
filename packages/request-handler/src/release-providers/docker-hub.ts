import { z } from "zod/v4";

import { fetchJsonAsync, loadOptionalDetailsAsync, providerUrl, tokenHeaders } from "./http";
import type { OwnedName } from "./identifier";
import { parseOwnedName } from "./identifier";
import type { RegistryTag } from "./registry-tags";
import { selectRegistryRelease } from "./registry-tags";
import type { ProjectDetails, ReleaseProvider } from "./types";

const MAX_TAG_PAGES = 5;

const tagsSchema = z.object({
  next: z.string().nullish(),
  results: z.array(
    z.object({
      name: z.string(),
      last_updated: z.string().nullish(),
      digest: z.string().nullish(),
    }),
  ),
});

const repositorySchema = z.object({
  name: z.string(),
  namespace: z.string(),
  description: z.string().nullish(),
  star_count: z.number().nullish(),
  date_registered: z
    .string()
    .transform((value) => new Date(value))
    .nullish(),
});

type DockerHubTag = z.infer<typeof tagsSchema>["results"][number];

const parseRepository = (identifier: string): OwnedName => {
  if (!identifier.includes("/")) return { owner: "library", name: identifier };
  return parseOwnedName(identifier, "namespace/repository");
};

const toRegistryTags = (tag: DockerHubTag): RegistryTag[] => {
  if (!tag.last_updated) return [];
  return [{ name: tag.name, date: new Date(tag.last_updated), digest: tag.digest ?? undefined }];
};

const listTagsAsync = async (repositoryUrl: string, headers: Record<string, string>, versionPattern?: RegExp) => {
  const tags: RegistryTag[] = [];
  for (let page = 1; page <= MAX_TAG_PAGES; page++) {
    const result = await fetchJsonAsync(`${repositoryUrl}/tags?page_size=100&page=${page}`, tagsSchema, { headers });
    tags.push(...result.results.flatMap(toRegistryTags));
    if (!result.next || !versionPattern || tags.some((tag) => versionPattern.test(tag.name))) break;
  }
  return tags;
};

const getHubPagePath = ({ namespace, name }: { namespace: string; name: string }) => {
  if (namespace === "library") return `_/${name}`;
  return `r/${namespace}/${name}`;
};

const getProjectDetailsAsync = async (
  repositoryUrl: string,
  headers: Record<string, string>,
): Promise<ProjectDetails> => {
  const repository = await fetchJsonAsync(`${repositoryUrl}/`, repositorySchema, { headers });
  return {
    projectUrl: `https://hub.docker.com/${getHubPagePath(repository)}`,
    projectDescription: repository.description ?? undefined,
    createdAt: repository.date_registered ?? undefined,
    starsCount: repository.star_count ?? undefined,
  };
};

export const getDockerHubReleaseAsync: ReleaseProvider = async (lookup) => {
  const { owner, name } = parseRepository(lookup.identifier);
  const repositoryUrl = providerUrl(
    lookup.baseUrl,
    `/v2/namespaces/${encodeURIComponent(owner)}/repositories/${encodeURIComponent(name)}`,
  );
  const headers = tokenHeaders(lookup.token, (token) => ({ Authorization: `Bearer ${token}` }));

  const release = selectRegistryRelease(await listTagsAsync(repositoryUrl, headers, lookup.versionPattern), lookup);
  const details = await loadOptionalDetailsAsync(() => getProjectDetailsAsync(repositoryUrl, headers));
  return { ...details, ...release };
};
