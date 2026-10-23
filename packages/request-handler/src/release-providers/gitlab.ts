import { z } from "zod/v4";

import { fetchJsonAsync, loadOptionalDetailsAsync, providerUrl, tokenHeaders } from "./http";
import type { ProjectDetails, Release, ReleaseProvider } from "./types";
import { noReleasesFoundError, selectNewestRelease } from "./versions";

const releasesSchema = z.array(
  z.object({
    tag_name: z.string(),
    released_at: z.string().nullish(),
    description: z.string().nullish(),
    _links: z.object({ self: z.string().optional() }).optional(),
  }),
);

const projectSchema = z.object({
  web_url: z.string(),
  description: z.string().nullish(),
  forked_from_project: z.unknown().nullish(),
  archived: z.boolean(),
  created_at: z.string(),
  star_count: z.number(),
  open_issues_count: z.number().optional(),
  forks_count: z.number(),
});

type GitlabRelease = z.infer<typeof releasesSchema>[number];

const toReleases = (release: GitlabRelease, now: Date): Release[] => {
  if (!release.released_at) return [];
  const releasedAt = new Date(release.released_at);
  return [
    {
      latestRelease: release.tag_name,
      latestReleaseAt: releasedAt,
      releaseUrl: release._links?.self,
      releaseDescription: release.description ?? undefined,
      isPreRelease: releasedAt > now,
    },
  ];
};

const getProjectDetailsAsync = async (projectUrl: string, headers: Record<string, string>): Promise<ProjectDetails> => {
  const project = await fetchJsonAsync(projectUrl, projectSchema, { headers });
  return {
    projectUrl: project.web_url,
    projectDescription: project.description ?? undefined,
    isFork: project.forked_from_project !== undefined && project.forked_from_project !== null,
    isArchived: project.archived,
    createdAt: new Date(project.created_at),
    starsCount: project.star_count,
    openIssues: project.open_issues_count,
    forksCount: project.forks_count,
  };
};

export const getGitlabReleaseAsync: ReleaseProvider = async ({ baseUrl, identifier, versionPattern, token }) => {
  const projectUrl = providerUrl(baseUrl, `/api/v4/projects/${encodeURIComponent(identifier)}`);
  const headers = tokenHeaders(token, (value) => ({ "PRIVATE-TOKEN": value }));

  const releases = await fetchJsonAsync(`${projectUrl}/releases?per_page=100`, releasesSchema, { headers });
  if (releases.length === 0) throw noReleasesFoundError(identifier);

  const now = new Date();
  const release = selectNewestRelease(
    releases.flatMap((candidate) => toReleases(candidate, now)),
    versionPattern,
  );
  const details = await loadOptionalDetailsAsync(() => getProjectDetailsAsync(projectUrl, headers));
  return { ...details, ...release };
};
