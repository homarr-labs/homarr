import { z } from "zod/v4";

import { fetchJsonAsync, loadOptionalDetailsAsync, providerUrl, tokenHeaders } from "./http";
import { encodeOwnedName, parseOwnedName } from "./identifier";
import type { ProjectDetails, Release, ReleaseProvider } from "./types";
import { noReleasesFoundError, selectNewestRelease } from "./versions";

const releasesSchema = z.array(
  z.object({
    tag_name: z.string(),
    published_at: z.string().transform((value) => new Date(value)),
    url: z.string(),
    html_url: z.string().optional(),
    body: z.string(),
    prerelease: z.boolean(),
  }),
);

const repositorySchema = z.object({
  html_url: z.string(),
  description: z.string(),
  fork: z.boolean(),
  archived: z.boolean(),
  created_at: z.string().transform((value) => new Date(value)),
  stars_count: z.number(),
  open_issues_count: z.number(),
  forks_count: z.number(),
});

type CodebergRelease = z.infer<typeof releasesSchema>[number];

const toRelease = (release: CodebergRelease): Release => ({
  latestRelease: release.tag_name,
  latestReleaseAt: release.published_at,
  releaseUrl: release.html_url ?? release.url,
  releaseDescription: release.body,
  isPreRelease: release.prerelease,
});

const getProjectDetailsAsync = async (
  repositoryUrl: string,
  headers: Record<string, string>,
): Promise<ProjectDetails> => {
  const repository = await fetchJsonAsync(repositoryUrl, repositorySchema, { headers });
  return {
    projectUrl: repository.html_url,
    projectDescription: repository.description,
    isFork: repository.fork,
    isArchived: repository.archived,
    createdAt: repository.created_at,
    starsCount: repository.stars_count,
    openIssues: repository.open_issues_count,
    forksCount: repository.forks_count,
  };
};

export const getCodebergReleaseAsync: ReleaseProvider = async ({ baseUrl, identifier, versionPattern, token }) => {
  const repositoryPath = encodeOwnedName(parseOwnedName(identifier, "owner/repository"));
  const repositoryUrl = providerUrl(baseUrl, `/api/v1/repos/${repositoryPath}`);
  const headers = tokenHeaders(token, (value) => ({ Authorization: `token ${value}` }));

  const releases = await fetchJsonAsync(`${repositoryUrl}/releases`, releasesSchema, { headers });
  if (releases.length === 0) throw noReleasesFoundError(identifier);

  const release = selectNewestRelease(releases.map(toRelease), versionPattern);
  const details = await loadOptionalDetailsAsync({ baseUrl, identifier, token }, () =>
    getProjectDetailsAsync(repositoryUrl, headers),
  );
  return { ...details, ...release };
};
