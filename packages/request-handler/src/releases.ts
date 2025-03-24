import dayjs from "dayjs";
import { z } from "zod";

import { fetchWithTimeout } from "@homarr/common";

import { Providers } from "../../widgets/src/releases/release-providers";
import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

const dockerHubDetailsSchema = z
  .object({
    name: z.string(),
    namespace: z.string(),
    description: z.string(),
    star_count: z.number(),
    date_registered: z.string().transform((value) => new Date(value)),
  })
  .transform((resp) => ({
    projectUrl: `https://hub.docker.com/r/${resp.namespace === "library" ? "_" : resp.namespace}/${resp.name}`,
    projectDescription: resp.description,
    isFork: false,
    isArchived: false,
    createdAt: resp.date_registered,
    starsCount: resp.star_count,
    openIssues: 0,
    forksCount: 0,
  }));

const dockerHubReleasesSchema = z
  .object({
    results: z.array(
      z
        .object({ name: z.string(), last_updated: z.string().transform((value) => new Date(value)) })
        .transform((tag) => ({
          identifier: "",
          latestRelease: tag.name,
          latestReleaseAt: tag.last_updated,
        })),
    ),
  })
  .transform((resp) => {
    return resp.results.map((release) => ({
      ...release,
      releaseUrl: "",
      releaseDescription: "",
      isPreRelease: false,
    }));
  });

const githubDetailsSchema = z
  .object({
    html_url: z.string(),
    description: z.string(),
    fork: z.boolean(),
    archived: z.boolean(),
    created_at: z.string().transform((value) => new Date(value)),
    stargazers_count: z.number(),
    open_issues_count: z.number(),
    forks_count: z.number(),
  })
  .transform((resp) => ({
    projectUrl: resp.html_url,
    projectDescription: resp.description,
    isFork: resp.fork,
    isArchived: resp.archived,
    createdAt: resp.created_at,
    starsCount: resp.stargazers_count,
    openIssues: resp.open_issues_count,
    forksCount: resp.forks_count,
  }));

const githubReleasesSchema = z.array(
  z
    .object({
      tag_name: z.string(),
      published_at: z.string().transform((value) => new Date(value)),
      html_url: z.string(),
      body: z.string(),
      prerelease: z.boolean(),
    })
    .transform((tag) => ({
      identifier: "",
      latestRelease: tag.tag_name,
      latestReleaseAt: tag.published_at,
      releaseUrl: tag.html_url,
      releaseDescription: tag.body,
      isPreRelease: tag.prerelease,
    })),
);

const gitlabDetailsSchema = z
  .object({
    web_url: z.string(),
    description: z.string(),
    forked_from_project: z.object({ id: z.number() }).nullable(),
    archived: z.boolean(),
    created_at: z.string().transform((value) => new Date(value)),
    star_count: z.number(),
    open_issues_count: z.number(),
    forks_count: z.number(),
  })
  .transform((resp) => ({
    projectUrl: resp.web_url,
    projectDescription: resp.description,
    isFork: resp.forked_from_project !== null,
    isArchived: resp.archived,
    createdAt: resp.created_at,
    starsCount: resp.star_count,
    openIssues: resp.open_issues_count,
    forksCount: resp.forks_count,
  }));

const gitlabReleasesSchema = z.array(
  z
    .object({
      name: z.string(),
      released_at: z.string().transform((value) => new Date(value)),
      description: z.string(),
      _links: z.object({ self: z.string() }),
      upcoming_release: z.boolean(),
    })
    .transform((tag) => ({
      identifier: "",
      latestRelease: tag.name,
      latestReleaseAt: tag.released_at,
      releaseUrl: tag._links.self,
      releaseDescription: tag.description,
      isPreRelease: tag.upcoming_release,
    })),
);

const npmReleasesSchema = z
  .object({
    time: z.record(z.string().transform((value) => new Date(value))).transform((version) =>
      Object.entries(version).map(([key, value]) => ({
        identifier: "",
        latestRelease: key,
        latestReleaseAt: value,
      })),
    ),
    versions: z.record(z.object({ description: z.string() })),
    name: z.string(),
  })
  .transform((resp) => {
    return resp.time.map((release) => ({
      ...release,
      releaseUrl: `https://www.npmjs.com/package/${resp.name}/v/${release.latestRelease}`,
      releaseDescription: resp.versions[release.latestRelease]?.description ?? "",
      isPreRelease: false,
    }));
  });

const codebergDetailsSchema = z
  .object({
    html_url: z.string(),
    description: z.string(),
    fork: z.boolean(),
    archived: z.boolean(),
    created_at: z.string().transform((value) => new Date(value)),
    stars_count: z.number(),
    open_issues_count: z.number(),
    forks_count: z.number(),
  })
  .transform((resp) => ({
    projectUrl: resp.html_url,
    projectDescription: resp.description,
    isFork: resp.fork,
    isArchived: resp.archived,
    createdAt: resp.created_at,
    starsCount: resp.stars_count,
    openIssues: resp.open_issues_count,
    forksCount: resp.forks_count,
  }));

const codebergReleasesSchema = z.array(
  z
    .object({
      tag_name: z.string(),
      published_at: z.string().transform((value) => new Date(value)),
      url: z.string(),
      body: z.string(),
      prerelease: z.boolean(),
    })
    .transform((tag) => ({
      identifier: "",
      latestRelease: tag.tag_name,
      latestReleaseAt: tag.published_at,
      releaseUrl: tag.url,
      releaseDescription: tag.body,
      isPreRelease: tag.prerelease,
    })),
);

const _releasesSchema = z.object({
  identifier: z.string(),
  latestRelease: z.string(),
  latestReleaseAt: z.date(),
  releaseUrl: z.string(),
  releaseDescription: z.string(),
  isPreRelease: z.boolean(),
  projectUrl: z.string(),
  projectDescription: z.string(),
  isFork: z.boolean(),
  isArchived: z.boolean(),
  createdAt: z.date(),
  starsCount: z.number(),
  openIssues: z.number(),
  forksCount: z.number(),
});

function getDockerHubUrl(identifier: string): string {
  if (identifier.indexOf("/") > 0) {
    const [owner, name] = identifier.split("/");
    if (!owner || !name) {
      return "";
    }
    return `https://hub.docker.com/v2/namespaces/${encodeURIComponent(owner)}/repositories/${encodeURIComponent(name)}`;
  } else {
    return `https://hub.docker.com/v2/repositories/library/${encodeURIComponent(identifier)}`;
  }
}

function getGithubUrl(identifier: string): string {
  return `https://api.github.com/repos/${encodeURIComponent(identifier)}`;
}

function getGitlabUrl(identifier: string): string {
  return `https://gitlab.com/api/v4/projects/${encodeURIComponent(identifier)}`;
}

function getNpmUrl(identifier: string): string {
  return `https://registry.npmjs.org/${encodeURIComponent(identifier)}`;
}

function getCodebergUrl(identifier: string): string {
  const [owner, name] = identifier.split("/");
  if (!owner || !name) {
    return "";
  }
  return `https://codeberg.org/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

export const releasesRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "releasesApiResult",
  widgetKind: "releases",
  async requestAsync(input: { providerName: string; identifier: string; versionRegex: string | undefined }) {
    let detailsUrl = "";
    let detailsSchema;
    let releasesurl = "";
    let releasesSchema;
    switch (input.providerName) {
      case Providers.DockerHub.name:
        detailsUrl = getDockerHubUrl(input.identifier);
        detailsSchema = dockerHubDetailsSchema;
        releasesurl = `${detailsUrl}/tags?page_size=50`;
        releasesSchema = dockerHubReleasesSchema;
        break;
      case Providers.Github.name:
        detailsUrl = getGithubUrl(input.identifier);
        detailsSchema = githubDetailsSchema;
        releasesurl = `${detailsUrl}/releases`;
        releasesSchema = githubReleasesSchema;
        break;
      case Providers.Gitlab.name:
        detailsUrl = getGitlabUrl(input.identifier);
        detailsSchema = gitlabDetailsSchema;
        releasesurl = `${detailsUrl}/releases`;
        releasesSchema = gitlabReleasesSchema;
        break;
      case Providers.Npm.name:
        detailsUrl = getNpmUrl(input.identifier);
        detailsSchema = undefined;
        releasesurl = detailsUrl;
        releasesSchema = npmReleasesSchema;
        break;
      case Providers.Codeberg.name:
        detailsUrl = getCodebergUrl(input.identifier);
        detailsSchema = codebergDetailsSchema;
        releasesurl = `${detailsUrl}/releases`;
        releasesSchema = codebergReleasesSchema;
        break;
    }

    if (releasesurl === "" || releasesSchema === undefined) return undefined;

    let detailsResult = {
      projectUrl: "",
      projectDescription: "",
      isFork: false,
      isArchived: false,
      createdAt: new Date(0),
      starsCount: 0,
      openIssues: 0,
      forksCount: 0,
    };
    if (detailsUrl !== releasesurl && detailsSchema !== undefined) {
      const detailsResponse = await fetchWithTimeout(detailsUrl);
      const parsedDetails = detailsSchema.safeParse(await detailsResponse.json());

      if (parsedDetails.success) {
        detailsResult = parsedDetails.data;
      }
    }

    const releasesResponse = await fetchWithTimeout(releasesurl);
    const releasesResult = releasesSchema.safeParse(await releasesResponse.json());

    if (!releasesResult.success) return undefined;

    const latest: ReleaseResponse = releasesResult.data
      .filter((result) => (input.versionRegex ? new RegExp(input.versionRegex).test(result.latestRelease) : false))
      .reduce(
        (latest, result) => {
          return {
            ...detailsResult,
            ...(result.latestReleaseAt > latest.latestReleaseAt ? result : latest),
            identifier: input.identifier,
          };
        },
        {
          identifier: "",
          latestRelease: "",
          latestReleaseAt: new Date(0),
          releaseUrl: "",
          releaseDescription: "",
          isPreRelease: false,
          projectUrl: "",
          projectDescription: "",
          isFork: false,
          isArchived: false,
          createdAt: new Date(0),
          starsCount: 0,
          openIssues: 0,
          forksCount: 0,
        },
      );

    return latest;
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

export type ReleaseResponse = z.infer<typeof _releasesSchema>;
