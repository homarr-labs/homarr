import { z } from "zod";

export interface ReleasesProvider {
  getDetailsUrl: (identifier: string) => string | undefined;
  parseDetailsResponse: (response: unknown) => z.SafeParseReturnType<unknown, DetailsResponse> | undefined;
  getReleasesUrl: (identifier: string) => string;
  parseReleasesResponse: (response: unknown) => z.SafeParseReturnType<unknown, ReleasesResponse[]>;
}

interface ProvidersProps {
  [key: string]: ReleasesProvider;
  DockerHub: ReleasesProvider;
  Github: ReleasesProvider;
  Gitlab: ReleasesProvider;
  Npm: ReleasesProvider;
  Codeberg: ReleasesProvider;
}

export const Providers: ProvidersProps = {
  DockerHub: {
    getDetailsUrl(identifier) {
      if (identifier.indexOf("/") > 0) {
        const [owner, name] = identifier.split("/");
        if (!owner || !name) {
          return "";
        }
        return `https://hub.docker.com/v2/namespaces/${encodeURIComponent(owner)}/repositories/${encodeURIComponent(name)}`;
      } else {
        return `https://hub.docker.com/v2/repositories/library/${encodeURIComponent(identifier)}`;
      }
    },
    parseDetailsResponse(response) {
      return z
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
          createdAt: resp.date_registered,
          starsCount: resp.star_count,
        }))
        .safeParse(response);
    },
    getReleasesUrl(identifier) {
      return `${this.getDetailsUrl(identifier)}/tags?page_size=200`;
    },
    parseReleasesResponse(response) {
      return z
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
          return resp.results.map((release) => release);
        })
        .safeParse(response);
    },
  },
  Github: {
    getDetailsUrl(identifier) {
      const [owner, name] = identifier.split("/");
      if (!owner || !name) {
        return "";
      }
      return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    },
    parseDetailsResponse(response) {
      return z
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
        }))
        .safeParse(response);
    },
    getReleasesUrl(identifier) {
      return `${this.getDetailsUrl(identifier)}/releases`;
    },
    parseReleasesResponse(response) {
      return z
        .array(
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
        )
        .safeParse(response);
    },
  },
  Gitlab: {
    getDetailsUrl(identifier) {
      return `https://gitlab.com/api/v4/projects/${encodeURIComponent(identifier)}`;
    },
    parseDetailsResponse(response) {
      return z
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
        }))
        .safeParse(response);
    },
    getReleasesUrl(identifier) {
      return `${this.getDetailsUrl(identifier)}/releases`;
    },
    parseReleasesResponse(response) {
      return z
        .array(
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
        )
        .safeParse(response);
    },
  },
  Npm: {
    getDetailsUrl(_) {
      return undefined;
    },
    parseDetailsResponse(_) {
      return undefined;
    },
    getReleasesUrl(identifier) {
      return `https://registry.npmjs.org/${encodeURIComponent(identifier)}`;
    },
    parseReleasesResponse(response) {
      return z
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
          }));
        })
        .safeParse(response);
    },
  },
  Codeberg: {
    getDetailsUrl(identifier) {
      const [owner, name] = identifier.split("/");
      if (!owner || !name) {
        return "";
      }
      return `https://codeberg.org/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    },
    parseDetailsResponse(response) {
      return z
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
        }))
        .safeParse(response);
    },
    getReleasesUrl(identifier) {
      return `${this.getDetailsUrl(identifier)}/releases`;
    },
    parseReleasesResponse(response) {
      return z
        .array(
          z
            .object({
              tag_name: z.string(),
              published_at: z.string().transform((value) => new Date(value)),
              url: z.string(),
              body: z.string(),
              prerelease: z.boolean(),
            })
            .transform((tag) => ({
              latestRelease: tag.tag_name,
              latestReleaseAt: tag.published_at,
              releaseUrl: tag.url,
              releaseDescription: tag.body,
              isPreRelease: tag.prerelease,
            })),
        )
        .safeParse(response);
    },
  },
};

const _detailsSchema = z
  .object({
    projectUrl: z.string().optional(),
    projectDescription: z.string().optional(),
    isFork: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    createdAt: z.date().optional(),
    starsCount: z.number().optional(),
    openIssues: z.number().optional(),
    forksCount: z.number().optional(),
  })
  .optional();

const _releasesSchema = z.object({
  latestRelease: z.string(),
  latestReleaseAt: z.date(),
  releaseUrl: z.string().optional(),
  releaseDescription: z.string().optional(),
  isPreRelease: z.boolean().optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

export type DetailsResponse = z.infer<typeof _detailsSchema>;

export type ReleasesResponse = z.infer<typeof _releasesSchema>;
