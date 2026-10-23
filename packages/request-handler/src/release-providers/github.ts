import { Octokit, RequestError as OctokitRequestError } from "octokit";

import { createLogger } from "@homarr/core/infrastructure/logs";

import { fetchWithTimeoutAsync, loadOptionalDetailsAsync } from "./http";
import type { OwnedName } from "./identifier";
import { parseOwnedName } from "./identifier";
import type { ProjectDetails, Release, ReleaseProvider } from "./types";
import { matchesVersionPattern, noReleasesFoundError, selectNewestRelease } from "./versions";

const logger = createLogger({ module: "githubReleaseProvider" });

type GithubRelease = Awaited<ReturnType<Octokit["rest"]["repos"]["listReleases"]>>["data"][number];

const createGithubClient = (baseUrl: string, token?: string) =>
  new Octokit({
    baseUrl,
    auth: token,
    request: { fetch: fetchWithTimeoutAsync },
    retry: { enabled: false },
    throttle: { enabled: false },
    userAgent: "Homarr-Lab/Homarr:GithubReleaseProvider",
  });

const getReleasePageSize = (versionPattern?: RegExp) => {
  if (versionPattern) return 100;
  return 10;
};

const isReleaseHistoryCap = (error: unknown) =>
  error instanceof OctokitRequestError &&
  error.status === 422 &&
  error.message.includes("Only the first 1000 results are available");

const listReleasesAsync = async (api: Octokit, repository: OwnedName, versionPattern?: RegExp) => {
  const releases: GithubRelease[] = [];
  try {
    for await (const page of api.paginate.iterator(api.rest.repos.listReleases, {
      owner: repository.owner,
      repo: repository.name,
      per_page: getReleasePageSize(versionPattern),
    })) {
      releases.push(...page.data);
      if (page.data.some((release) => matchesVersionPattern(release.tag_name, versionPattern))) break;
    }
  } catch (error) {
    if (!isReleaseHistoryCap(error) || releases.length === 0) throw error;
    logger.warn("GitHub release history capped, using the releases returned so far", {
      repository: `${repository.owner}/${repository.name}`,
      count: releases.length,
    });
  }
  return releases;
};

const toReleases = (release: GithubRelease): Release[] => {
  if (!release.published_at) return [];
  return [
    {
      latestRelease: release.tag_name,
      latestReleaseAt: new Date(release.published_at),
      releaseUrl: release.html_url,
      releaseDescription: release.body ?? undefined,
      isPreRelease: release.prerelease,
    },
  ];
};

const getProjectDetailsAsync = async (api: Octokit, repository: OwnedName): Promise<ProjectDetails> => {
  const { data } = await api.rest.repos.get({ owner: repository.owner, repo: repository.name });
  return {
    projectUrl: data.html_url,
    projectDescription: data.description ?? undefined,
    isFork: data.fork,
    isArchived: data.archived,
    createdAt: new Date(data.created_at),
    starsCount: data.stargazers_count,
    openIssues: data.open_issues_count,
    forksCount: data.forks_count,
  };
};

export const getGithubReleaseAsync: ReleaseProvider = async ({ baseUrl, identifier, versionPattern, token }) => {
  const repository = parseOwnedName(identifier, "owner/repository");
  const api = createGithubClient(baseUrl, token);

  const releases = await listReleasesAsync(api, repository, versionPattern);
  if (releases.length === 0) throw noReleasesFoundError(identifier);

  const release = selectNewestRelease(releases.flatMap(toReleases), versionPattern);
  const details = await loadOptionalDetailsAsync(() => getProjectDetailsAsync(api, repository));
  return { ...details, ...release };
};
