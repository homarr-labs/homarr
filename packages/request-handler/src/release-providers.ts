import { Octokit, RequestError as OctokitRequestError } from "octokit";
import { z } from "zod/v4";

import type { ReleaseProviderKind } from "@homarr/definitions";
import { getReleaseProviderDefaultUrl, normalizeReleaseProviderIdentifier } from "@homarr/definitions";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "releaseProviders" });

export interface ReleasesRepositoryRequest extends Record<string, unknown> {
  id: string;
  provider: ReleaseProviderKind;
  identifier: string;
  versionRegex?: string;
  providerUrl?: string;
  token?: string;
}

export interface DetailsProviderResponse {
  projectUrl?: string;
  projectDescription?: string;
  isFork?: boolean;
  isArchived?: boolean;
  createdAt?: Date;
  starsCount?: number;
  openIssues?: number;
  forksCount?: number;
}

export interface ReleaseProviderResponse {
  latestRelease: string;
  latestReleaseAt: Date;
  releaseUrl?: string;
  releaseDescription?: string;
  isPreRelease?: boolean;
}

export type ReleaseData = DetailsProviderResponse & ReleaseProviderResponse;
export type ReleaseError =
  | { code: "invalidIdentifier" | "noMatchingVersion" | "noReleasesFound" }
  | { code: "unexpected"; message: string };
export type ReleaseResponse = { success: true; data: ReleaseData } | { success: false; error: ReleaseError };

export const getLatestRelease = (
  releases: ReleaseProviderResponse[],
  versionRegex?: string,
): ReleaseProviderResponse | null => {
  const validReleases = releases.filter((result) => {
    if (!result.latestRelease) return false;
    return versionRegex ? new RegExp(versionRegex).test(result.latestRelease) : true;
  });

  return validReleases.length === 0
    ? null
    : validReleases.reduce((latest, current) => (current.latestReleaseAt > latest.latestReleaseAt ? current : latest));
};

export const getLatestMatchingReleaseAsync = async (input: ReleasesRepositoryRequest): Promise<ReleaseResponse> => {
  const baseUrl = removeTrailingSlash(input.providerUrl ?? getReleaseProviderDefaultUrl(input.provider));
  const identifier = normalizeReleaseProviderIdentifier(input.provider, input.identifier);

  switch (input.provider) {
    case "github":
      return await getGithubReleaseAsync(baseUrl, identifier, input.versionRegex, input.token);
    case "gitHubContainerRegistry":
      return await getGitHubContainerRegistryReleaseAsync(baseUrl, identifier, input.versionRegex, input.token);
    case "dockerHub":
      return await getDockerHubReleaseAsync(baseUrl, identifier, input.versionRegex, input.token);
    case "gitlab":
      return await getGitlabReleaseAsync(baseUrl, identifier, input.versionRegex, input.token);
    case "npm":
      return await getNpmReleaseAsync(baseUrl, identifier, input.versionRegex, input.token);
    case "codeberg":
      return await getCodebergReleaseAsync(baseUrl, identifier, input.versionRegex, input.token);
    case "linuxServerIO":
      return await getLinuxServerIOReleaseAsync(baseUrl, identifier);
    case "quay":
      return await getQuayReleaseAsync(baseUrl, identifier, input.versionRegex);
  }
};

const parseOwnerName = (identifier: string) => {
  const [owner, name] = identifier.split("/");
  if (!owner || !name) return null;
  return { owner, name };
};

const parseOwnerPackageName = (identifier: string) => {
  const [owner, ...nameParts] = identifier.split("/");
  const name = nameParts.join("/");
  if (!owner || !name) return null;
  return { owner, name };
};

const removeTrailingSlash = (url: string) => url.replace(/\/$/, "");

const buildUrl = (baseUrl: string, path: `/${string}`) => new URL(`${baseUrl}${path}`);

const getGithubApi = (baseUrl: string, userAgent: string, token?: string) =>
  new Octokit({
    baseUrl,
    auth: token,
    request: { fetch: fetchWithTrustedCertificatesAsync },
    throttle: { enabled: false },
    userAgent,
  });

const getGithubReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  const parsed = parseOwnerName(identifier);
  if (!parsed) return { success: false, error: { code: "invalidIdentifier" } };

  const api = getGithubApi(baseUrl, "Homarr-Lab/Homarr:GithubReleaseProvider", token);
  try {
    const releasesResponse = await api.rest.repos.listReleases({ owner: parsed.owner, repo: parsed.name });
    if (releasesResponse.data.length === 0) return { success: false, error: { code: "noMatchingVersion" } };

    const releases = releasesResponse.data.reduce<ReleaseProviderResponse[]>((acc, release) => {
      if (!release.published_at) return acc;
      acc.push({
        latestRelease: release.tag_name,
        latestReleaseAt: new Date(release.published_at),
        releaseUrl: release.html_url,
        releaseDescription: release.body ?? undefined,
        isPreRelease: release.prerelease,
      });
      return acc;
    }, []);
    const latestRelease = getLatestRelease(releases, versionRegex);
    if (!latestRelease) return { success: false, error: { code: "noMatchingVersion" } };

    const details = await getGithubDetailsAsync(api, parsed.owner, parsed.name);
    return { success: true, data: { ...details, ...latestRelease } };
  } catch (error) {
    const message = error instanceof OctokitRequestError ? error.message : String(error);
    logger.warn("Failed to get GitHub releases", { identifier, error: message });
    return { success: false, error: { code: "unexpected", message } };
  }
};

const getGithubDetailsAsync = async (api: Octokit, owner: string, name: string): Promise<DetailsProviderResponse> => {
  try {
    const response = await api.rest.repos.get({ owner, repo: name });
    return {
      projectUrl: response.data.html_url,
      projectDescription: response.data.description ?? undefined,
      isFork: response.data.fork,
      isArchived: response.data.archived,
      createdAt: new Date(response.data.created_at),
      starsCount: response.data.stargazers_count,
      openIssues: response.data.open_issues_count,
      forksCount: response.data.forks_count,
    };
  } catch (error) {
    logger.warn("Failed to get GitHub details", { owner, name, error: String(error) });
    return {};
  }
};

const getGitHubContainerRegistryReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  const parsed = parseOwnerPackageName(identifier);
  if (!parsed) return { success: false, error: { code: "invalidIdentifier" } };

  try {
    const repositoryName = `${parsed.owner}/${parsed.name}`;
    const registryUrl = new URL(baseUrl);
    const registryToken = token ?? (await getGitHubContainerRegistryTokenAsync(registryUrl, repositoryName));
    const tags = await getGitHubContainerRegistryTagsAsync(registryUrl, repositoryName, registryToken);
    const matchingTags = versionRegex ? tags.filter((tag) => new RegExp(versionRegex).test(tag)) : tags;
    const tagsToCheck = versionRegex
      ? matchingTags.slice(-100)
      : matchingTags.includes("latest")
        ? ["latest"]
        : matchingTags.slice(-100);
    if (tagsToCheck.length === 0) return { success: false, error: { code: "noMatchingVersion" } };

    const releases = await Promise.all(
      tagsToCheck.map(async (tag) => ({
        latestRelease: tag,
        latestReleaseAt: await getGitHubContainerRegistryTagCreatedAtAsync(
          registryUrl,
          repositoryName,
          tag,
          registryToken,
        ),
        releaseUrl: `https://github.com/${repositoryName}/pkgs/container/${encodeURIComponent(parsed.name)}`,
      })),
    );
    const latestRelease = getLatestRelease(releases, versionRegex);
    if (!latestRelease) return { success: false, error: { code: "noMatchingVersion" } };

    return {
      success: true,
      data: {
        projectUrl: `https://github.com/${repositoryName}`,
        ...latestRelease,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Failed to get GitHub container registry releases", { identifier, error: message });
    return { success: false, error: { code: "unexpected", message } };
  }
};

const gitHubContainerRegistryTokenSchema = z.object({ token: z.string() });
const gitHubContainerRegistryTagsSchema = z.object({ tags: z.array(z.string()).optional() });
const gitHubContainerRegistryManifestSchema = z.object({
  config: z.object({ digest: z.string() }).optional(),
  manifests: z.array(z.object({ digest: z.string() })).optional(),
});
const gitHubContainerRegistryConfigSchema = z.object({
  created: z.string().transform((value) => new Date(value)),
});

const getGitHubContainerRegistryTokenAsync = async (registryUrl: URL, repositoryName: string) => {
  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(
      registryUrl.origin,
      `/token?service=${registryUrl.host}&scope=${encodeURIComponent(`repository:${repositoryName}:pull`)}` as `/${string}`,
    ),
  );
  if (!response.ok) throw new Error(response.statusText);

  const result = gitHubContainerRegistryTokenSchema.safeParse(await response.json());
  if (!result.success) throw new Error(result.error.message);

  return result.data.token;
};

const getGitHubContainerRegistryTagsAsync = async (registryUrl: URL, repositoryName: string, token: string) => {
  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(registryUrl.origin, `/v2/${repositoryName}/tags/list`),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(response.statusText);

  const result = gitHubContainerRegistryTagsSchema.safeParse(await response.json());
  if (!result.success) throw new Error(result.error.message);

  return result.data.tags ?? [];
};

const getGitHubContainerRegistryTagCreatedAtAsync = async (
  registryUrl: URL,
  repositoryName: string,
  tag: string,
  token: string,
) => {
  const manifest = await getGitHubContainerRegistryManifestAsync(registryUrl, repositoryName, tag, token);
  const imageManifest = manifest.config
    ? manifest
    : await getGitHubContainerRegistryManifestAsync(
        registryUrl,
        repositoryName,
        manifest.manifests?.[0]?.digest ?? "",
        token,
      );
  const configDigest = imageManifest.config?.digest;
  if (!configDigest) throw new Error("Missing image config digest");

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(registryUrl.origin, `/v2/${repositoryName}/blobs/${configDigest}`),
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(response.statusText);

  const result = gitHubContainerRegistryConfigSchema.safeParse(await response.json());
  if (!result.success) throw new Error(result.error.message);

  return result.data.created;
};

const getGitHubContainerRegistryManifestAsync = async (
  registryUrl: URL,
  repositoryName: string,
  reference: string,
  token: string,
) => {
  if (!reference) throw new Error("Missing image manifest reference");

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(registryUrl.origin, `/v2/${repositoryName}/manifests/${reference}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: [
          "application/vnd.oci.image.index.v1+json",
          "application/vnd.docker.distribution.manifest.list.v2+json",
          "application/vnd.oci.image.manifest.v1+json",
          "application/vnd.docker.distribution.manifest.v2+json",
        ].join(", "),
      },
    },
  );
  if (!response.ok) throw new Error(response.statusText);

  const result = gitHubContainerRegistryManifestSchema.safeParse(await response.json());
  if (!result.success) throw new Error(result.error.message);

  return result.data;
};

const dockerHubReleasesSchema = z.object({
  results: z.array(
    z.object({ name: z.string(), last_updated: z.string().transform((value) => new Date(value)) }).transform((tag) => ({
      latestRelease: tag.name,
      latestReleaseAt: tag.last_updated,
    })),
  ),
});

const dockerHubDetailsSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  description: z.string(),
  star_count: z.number(),
  date_registered: z.string().transform((value) => new Date(value)),
});

const getDockerHubReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  const parsed = identifier.includes("/") ? parseOwnerName(identifier) : { owner: "", name: identifier };
  if (!parsed) return { success: false, error: { code: "invalidIdentifier" } };

  const relativeUrl = parsed.owner
    ? `/v2/namespaces/${encodeURIComponent(parsed.owner)}/repositories/${encodeURIComponent(parsed.name)}`
    : `/v2/repositories/library/${encodeURIComponent(parsed.name)}`;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  for (let page = 0; page <= 5; page++) {
    const response = await fetchWithTrustedCertificatesAsync(
      buildUrl(baseUrl, `${relativeUrl}/tags?page_size=100&page=${page}` as `/${string}`),
      headers.Authorization ? { headers } : undefined,
    );
    if (!response.ok) return { success: false, error: { code: "unexpected", message: response.statusText } };

    const json: unknown = await response.json();
    const result = dockerHubReleasesSchema.safeParse(json);
    if (!result.success) return { success: false, error: { code: "unexpected", message: result.error.message } };

    const latestRelease = getLatestRelease(result.data.results, versionRegex);
    if (!latestRelease) continue;

    const details = await getDockerHubDetailsAsync(baseUrl, relativeUrl as `/${string}`, token);
    return { success: true, data: { ...details, ...latestRelease } };
  }

  return { success: false, error: { code: "noMatchingVersion" } };
};

const getDockerHubDetailsAsync = async (
  baseUrl: string,
  relativeUrl: `/${string}`,
  token?: string,
): Promise<DetailsProviderResponse> => {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, `${relativeUrl}/` as `/${string}`),
    headers.Authorization ? { headers } : undefined,
  );
  if (!response.ok) return {};

  const result = dockerHubDetailsSchema.safeParse(await response.json());
  if (!result.success) return {};

  return {
    projectUrl: `https://hub.docker.com/r/${result.data.namespace}/${result.data.name}`,
    projectDescription: result.data.description,
    createdAt: result.data.date_registered,
    starsCount: result.data.star_count,
  };
};

const gitlabReleasesSchema = z.array(
  z.object({
    name: z.string().nullable().optional(),
    tag_name: z.string(),
    released_at: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    _links: z.object({ self: z.string().optional() }).optional(),
  }),
);

const gitlabDetailsSchema = z.object({
  web_url: z.string().optional(),
  description: z.string().nullable().optional(),
  forked_from_project: z.unknown().nullable().optional(),
  archived: z.boolean(),
  created_at: z.string(),
  star_count: z.number(),
  open_issues_count: z.number().optional(),
  forks_count: z.number(),
});

const getGitlabReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  const encodedIdentifier = encodeURIComponent(identifier);
  const headers: Record<string, string> = {};
  if (token) headers["PRIVATE-TOKEN"] = token;

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, `/api/v4/projects/${encodedIdentifier}/releases?per_page=100`),
    headers["PRIVATE-TOKEN"] ? { headers } : undefined,
  );
  if (!response.ok) return { success: false, error: { code: "unexpected", message: response.statusText } };

  const result = gitlabReleasesSchema.safeParse(await response.json());
  if (!result.success) return { success: false, error: { code: "unexpected", message: result.error.message } };
  if (result.data.length === 0) return { success: false, error: { code: "noReleasesFound" } };

  const releases = result.data.reduce<ReleaseProviderResponse[]>((acc, release) => {
    if (!release.released_at) return acc;
    const releaseDate = new Date(release.released_at);
    acc.push({
      latestRelease: release.name ?? release.tag_name,
      latestReleaseAt: releaseDate,
      releaseUrl: release._links?.self,
      releaseDescription: release.description ?? undefined,
      isPreRelease: releaseDate > new Date(),
    });
    return acc;
  }, []);
  const latestRelease = getLatestRelease(releases, versionRegex);
  if (!latestRelease) return { success: false, error: { code: "noMatchingVersion" } };

  const details = await getGitlabDetailsAsync(baseUrl, encodedIdentifier, token);
  return { success: true, data: { ...details, ...latestRelease } };
};

const getGitlabDetailsAsync = async (
  baseUrl: string,
  encodedIdentifier: string,
  token?: string,
): Promise<DetailsProviderResponse> => {
  const headers: Record<string, string> = {};
  if (token) headers["PRIVATE-TOKEN"] = token;

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, `/api/v4/projects/${encodedIdentifier}`),
    headers["PRIVATE-TOKEN"] ? { headers } : undefined,
  );
  if (!response.ok) return {};

  const result = gitlabDetailsSchema.safeParse(await response.json());
  if (!result.success || !result.data.web_url) return {};

  return {
    projectUrl: result.data.web_url,
    projectDescription: result.data.description ?? undefined,
    isFork: result.data.forked_from_project !== null,
    isArchived: result.data.archived,
    createdAt: new Date(result.data.created_at),
    starsCount: result.data.star_count,
    openIssues: result.data.open_issues_count,
    forksCount: result.data.forks_count,
  };
};

const npmTimeMetadataKeys = new Set(["created", "modified"]);

const npmReleasesSchema = z.object({
  time: z
    .record(
      z.string(),
      z.string().transform((value) => new Date(value)),
    )
    .transform((entries) =>
      Object.entries(entries)
        .filter(([key]) => !npmTimeMetadataKeys.has(key))
        .map(([key, value]) => ({ latestRelease: key, latestReleaseAt: value })),
    ),
  versions: z.record(z.string(), z.object({ description: z.string().optional() })),
  name: z.string(),
});

const getNpmReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  if (!identifier) return { success: false, error: { code: "invalidIdentifier" } };

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, `/${encodeURIComponent(identifier)}`),
    headers.Authorization ? { headers } : undefined,
  );
  if (!response.ok) return { success: false, error: { code: "unexpected", message: response.statusText } };

  const result = npmReleasesSchema.safeParse(await response.json());
  if (!result.success) return { success: false, error: { code: "unexpected", message: result.error.message } };

  const releases = result.data.time.map((tag) => ({
    ...tag,
    releaseUrl: `https://www.npmjs.com/package/${encodeURIComponent(result.data.name)}/v/${encodeURIComponent(tag.latestRelease)}`,
    releaseDescription: result.data.versions[tag.latestRelease]?.description ?? "",
  }));
  const latestRelease = getLatestRelease(releases, versionRegex);
  if (!latestRelease) return { success: false, error: { code: "noMatchingVersion" } };

  return { success: true, data: latestRelease };
};

const codebergReleasesSchema = z.array(
  z.object({
    tag_name: z.string(),
    published_at: z.string().transform((value) => new Date(value)),
    url: z.string(),
    body: z.string(),
    prerelease: z.boolean(),
  }),
);

const codebergDetailsSchema = z.object({
  html_url: z.string(),
  description: z.string(),
  fork: z.boolean(),
  archived: z.boolean(),
  created_at: z.string().transform((value) => new Date(value)),
  stars_count: z.number(),
  open_issues_count: z.number(),
  forks_count: z.number(),
});

const getCodebergReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  const parsed = parseOwnerName(identifier);
  if (!parsed) return { success: false, error: { code: "invalidIdentifier" } };

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `token ${token}`;

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, `/api/v1/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}/releases`),
    headers.Authorization ? { headers } : undefined,
  );
  if (!response.ok) return { success: false, error: { code: "unexpected", message: response.statusText } };

  const result = codebergReleasesSchema.safeParse(await response.json());
  if (!result.success) return { success: false, error: { code: "unexpected", message: result.error.message } };

  const releases = result.data.map((tag) => ({
    latestRelease: tag.tag_name,
    latestReleaseAt: tag.published_at,
    releaseUrl: tag.url,
    releaseDescription: tag.body,
    isPreRelease: tag.prerelease,
  }));
  const latestRelease = getLatestRelease(releases, versionRegex);
  if (!latestRelease) return { success: false, error: { code: "noMatchingVersion" } };

  const details = await getCodebergDetailsAsync(baseUrl, parsed.owner, parsed.name, token);
  return { success: true, data: { ...details, ...latestRelease } };
};

const getCodebergDetailsAsync = async (
  baseUrl: string,
  owner: string,
  name: string,
  token?: string,
): Promise<DetailsProviderResponse> => {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `token ${token}`;

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(baseUrl, `/api/v1/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`),
    headers.Authorization ? { headers } : undefined,
  );
  if (!response.ok) return {};

  const result = codebergDetailsSchema.safeParse(await response.json());
  if (!result.success) return {};

  return {
    projectUrl: result.data.html_url,
    projectDescription: result.data.description,
    isFork: result.data.fork,
    isArchived: result.data.archived,
    createdAt: result.data.created_at,
    starsCount: result.data.stars_count,
    openIssues: result.data.open_issues_count,
    forksCount: result.data.forks_count,
  };
};

const linuxServerIOReleasesSchema = z.object({
  data: z.object({
    repositories: z.object({
      linuxserver: z.array(
        z.object({
          name: z.string(),
          initial_date: z
            .string()
            .transform((value) => new Date(value))
            .optional(),
          github_url: z.string(),
          description: z.string(),
          version: z.string(),
          version_timestamp: z.string().transform((value) => new Date(value)),
          stars: z.number(),
          deprecated: z.boolean(),
          changelog: z.array(z.object({ date: z.string(), desc: z.string() })).optional(),
        }),
      ),
    }),
  }),
});

const getLinuxServerIOReleaseAsync = async (baseUrl: string, identifier: string): Promise<ReleaseResponse> => {
  const parsed = parseOwnerName(identifier);
  if (!parsed) return { success: false, error: { code: "invalidIdentifier" } };

  const response = await fetchWithTrustedCertificatesAsync(buildUrl(baseUrl, "/api/v1/images"));
  if (!response.ok) return { success: false, error: { code: "unexpected", message: response.statusText } };

  const result = linuxServerIOReleasesSchema.safeParse(await response.json());
  if (!result.success) return { success: false, error: { code: "unexpected", message: result.error.message } };

  const release = result.data.data.repositories.linuxserver.find((repo) => repo.name === parsed.name);
  if (!release) return { success: false, error: { code: "noMatchingVersion" } };

  return {
    success: true,
    data: {
      latestRelease: release.version,
      latestReleaseAt: release.version_timestamp,
      releaseDescription: release.changelog?.shift()?.desc,
      projectUrl: release.github_url,
      projectDescription: release.description,
      isArchived: release.deprecated,
      createdAt: release.initial_date,
      starsCount: release.stars,
    },
  };
};

const quayReleasesSchema = z.object({
  description: z.string().optional(),
  tags: z.record(z.string(), z.object({ name: z.string(), last_modified: z.string() })),
});

const getQuayReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
): Promise<ReleaseResponse> => {
  const parsed = parseOwnerName(identifier);
  if (!parsed) return { success: false, error: { code: "invalidIdentifier" } };

  const response = await fetchWithTrustedCertificatesAsync(
    buildUrl(
      baseUrl,
      `/api/v1/repository/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}?includeTags=true&includeStats=true`,
    ),
  );
  if (!response.ok) return { success: false, error: { code: "unexpected", message: response.statusText } };

  const result = quayReleasesSchema.safeParse(await response.json());
  if (!result.success) return { success: false, error: { code: "unexpected", message: result.error.message } };

  const releases = Object.values(result.data.tags).reduce<ReleaseProviderResponse[]>((acc, tag) => {
    if (!tag.name || !tag.last_modified) return acc;
    acc.push({
      latestRelease: tag.name,
      latestReleaseAt: new Date(tag.last_modified),
      releaseUrl: `https://quay.io/repository/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}/tag/${encodeURIComponent(tag.name)}`,
    });
    return acc;
  }, []);
  const latestRelease = getLatestRelease(releases, versionRegex);
  if (!latestRelease) return { success: false, error: { code: "noMatchingVersion" } };

  return { success: true, data: { projectDescription: result.data.description, ...latestRelease } };
};
