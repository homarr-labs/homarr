import { Octokit, RequestError as OctokitRequestError } from "octokit";
import { z } from "zod/v4";

import type { ReleaseProviderKind } from "@homarr/definitions";
import { getReleaseProviderDefaultUrl, normalizeReleaseProviderIdentifier } from "@homarr/definitions";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";

const logger = createLogger({ module: "releaseProviders" });

const PROVIDER_TIMEOUT_MS = 10_000;
const fetchProvider: typeof fetchWithTrustedCertificatesAsync = (url, options) =>
  fetchWithTrustedCertificatesAsync(url, { timeout: PROVIDER_TIMEOUT_MS, ...options });

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
  resolvedFromTag?: string;
  releaseUrl?: string;
  releaseDescription?: string;
  isPreRelease?: boolean;
}

export type ReleaseData = DetailsProviderResponse & ReleaseProviderResponse;
export type ReleaseError = {
  code: "invalidIdentifier" | "noMatchingVersion" | "noReleasesFound" | "notFound" | "rateLimited" | "unexpected";
  message: string;
};
export type ReleaseResponse = { success: true; data: ReleaseData } | { success: false; error: ReleaseError };

class ProviderHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProviderHttpError";
  }
}

const getHttpErrorCode = (status: number): ReleaseError["code"] => {
  if (status === 404) return "notFound";
  if (status === 429) return "rateLimited";
  return "unexpected";
};

const toReleaseError = (error: unknown): ReleaseError => {
  if (error instanceof OctokitRequestError) {
    const isRateLimited =
      error.status === 429 ||
      (error.status === 403 &&
        (error.response?.headers["x-ratelimit-remaining"] === "0" || /rate limit/i.test(error.message)));
    if (isRateLimited) return { code: "rateLimited", message: error.message };
    return { code: getHttpErrorCode(error.status), message: error.message };
  }
  if (error instanceof ProviderHttpError) return { code: getHttpErrorCode(error.status), message: error.message };
  return { code: "unexpected", message: error instanceof Error ? error.message : String(error) };
};

const failure = (error: ReleaseError): ReleaseResponse => ({ success: false, error });

const compileVersionRegex = (versionRegex?: string): RegExp | null => {
  if (!versionRegex) return null;
  try {
    return new RegExp(versionRegex);
  } catch {
    return null;
  }
};

const parseVersion = (tag: string) => /\d+(?:\.\d+)*/.exec(tag)?.[0].split(".").map(Number);

const compareVersions = (left: number[], right: number[]) => {
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? -1) - (right[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
};

const isPlainVersionTag = (tag: string) => /^v?\d{1,4}(?:\.\d+)*$/.test(tag);

const isVersionLikeTag = (tag: string) => isPlainVersionTag(tag) || /\d+\.\d+/.test(tag);

const floatingTagNames = ["latest", "release", "stable"];

interface RegistryTag {
  name: string;
  date: Date;
  digest?: string;
}

const pickHighestVersion = <TTag extends { name: string; date?: Date }>(tags: TTag[]) =>
  tags
    .map((tag) => ({ tag, version: parseVersion(tag.name) ?? [] }))
    .toSorted(
      (left, right) =>
        compareVersions(right.version, left.version) ||
        (right.tag.date?.getTime() ?? 0) - (left.tag.date?.getTime() ?? 0),
    )[0]?.tag;

const pickMostSpecificVersion = <TTag extends { name: string }>(tags: TTag[]) =>
  tags
    .filter((tag) => isVersionLikeTag(tag.name))
    .toSorted(
      (left, right) =>
        Number(isPlainVersionTag(right.name)) - Number(isPlainVersionTag(left.name)) ||
        (parseVersion(right.name)?.length ?? 0) - (parseVersion(left.name)?.length ?? 0) ||
        left.name.length - right.name.length,
    )[0];

const selectRegistryTag = (tags: RegistryTag[], regex: RegExp | null): ReleaseProviderResponse | null => {
  if (regex) {
    const tag = pickHighestVersion(tags.filter((candidate) => regex.test(candidate.name)));
    return tag ? { latestRelease: tag.name, latestReleaseAt: tag.date } : null;
  }

  const floatingTag = floatingTagNames
    .map((name) => tags.find((tag) => tag.name === name))
    .find((tag) => tag !== undefined);
  if (floatingTag) {
    const versionTag = floatingTag.digest
      ? pickMostSpecificVersion(
          tags.filter((tag) => tag.name !== floatingTag.name && tag.digest === floatingTag.digest),
        )
      : undefined;
    return {
      latestRelease: versionTag?.name ?? floatingTag.name,
      latestReleaseAt: floatingTag.date,
      resolvedFromTag: versionTag ? floatingTag.name : undefined,
    };
  }

  const tag =
    pickHighestVersion(tags.filter((candidate) => isPlainVersionTag(candidate.name))) ??
    tags.toSorted((left, right) => right.date.getTime() - left.date.getTime())[0];
  return tag ? { latestRelease: tag.name, latestReleaseAt: tag.date } : null;
};

const describeNoMatch = (tags: string[], versionRegex?: string) => {
  const sampleTags = tags.slice(0, 5).join(", ");
  return versionRegex
    ? `Regex /${versionRegex}/ matched 0/${tags.length} tags. Sample tags: [${sampleTags}]`
    : `Found ${tags.length} tags but none could be used. Sample tags: [${sampleTags}]`;
};

export const getLatestRelease = (
  releases: ReleaseProviderResponse[],
  versionRegex?: string,
): { release: ReleaseProviderResponse } | { noMatch: string } => {
  const regex = compileVersionRegex(versionRegex);
  if (versionRegex && !regex) {
    return { noMatch: `Invalid regex: /${versionRegex}/` };
  }

  const validReleases = releases.filter((result) => {
    if (!result.latestRelease) return false;
    return regex ? regex.test(result.latestRelease) : true;
  });

  if (validReleases.length > 0) {
    return {
      release: validReleases.reduce((latest, current) =>
        current.latestReleaseAt > latest.latestReleaseAt ? current : latest,
      ),
    };
  }

  const sampleTags = releases
    .slice(0, 5)
    .map((r) => r.latestRelease)
    .join(", ");
  const reason = versionRegex
    ? `Regex /${versionRegex}/ matched 0/${releases.length} tags. Sample tags: [${sampleTags}]`
    : `Found ${releases.length} releases but none had a valid tag`;
  return { noMatch: reason };
};

export const getLatestMatchingReleaseAsync = async (input: ReleasesRepositoryRequest): Promise<ReleaseResponse> => {
  const baseUrl = removeTrailingSlash(input.providerUrl ?? getReleaseProviderDefaultUrl(input.provider));
  const identifier = normalizeReleaseProviderIdentifier(input.provider, input.identifier);

  if (input.versionRegex && !compileVersionRegex(input.versionRegex)) {
    return failure({ code: "noMatchingVersion", message: `Invalid regex: /${input.versionRegex}/` });
  }

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
      return await getLinuxServerIOReleaseAsync(baseUrl, identifier, input.versionRegex);
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

const buildUrl = (baseUrl: string, path: `/${string}`) => new URL(`${baseUrl}${path}`).toString();

const getGithubApi = (baseUrl: string, userAgent: string, token?: string) =>
  new Octokit({
    baseUrl,
    auth: token,
    request: { fetch: fetchProvider },
    // Interactive widget queries must surface provider errors without waiting for backoff.
    retry: { enabled: false },
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
  if (!parsed) return failure({ code: "invalidIdentifier", message: `Cannot parse "${identifier}" as owner/repo` });

  const regex = compileVersionRegex(versionRegex);
  const api = getGithubApi(baseUrl, "Homarr-Lab/Homarr:GithubReleaseProvider", token);
  try {
    const allReleases: Awaited<ReturnType<typeof api.rest.repos.listReleases>>["data"] = [];
    try {
      // Releases are listed newest first, so only page further while a version filter has not matched yet.
      for await (const page of api.paginate.iterator(api.rest.repos.listReleases, {
        owner: parsed.owner,
        repo: parsed.name,
        per_page: regex ? 100 : 10,
      })) {
        allReleases.push(...page.data);
        if (!regex || page.data.some((release) => regex.test(release.tag_name))) break;
      }
    } catch (error) {
      // GitHub can reject a later page even though earlier pages contain the latest release.
      if (
        !(error instanceof OctokitRequestError) ||
        error.status !== 422 ||
        !error.message.includes("Only the first 1000 results are available") ||
        allReleases.length === 0
      ) {
        throw error;
      }
      logger.warn("GitHub release history capped; using the returned releases", {
        identifier,
        count: allReleases.length,
      });
    }
    if (allReleases.length === 0) {
      return failure({ code: "noReleasesFound", message: `${identifier} has no GitHub releases` });
    }

    const releases = allReleases.reduce<ReleaseProviderResponse[]>((acc, release) => {
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
    const result = getLatestRelease(releases, versionRegex);
    if ("noMatch" in result) return failure({ code: "noMatchingVersion", message: result.noMatch });

    const details = await getGithubDetailsAsync(api, parsed.owner, parsed.name);
    return { success: true, data: { ...details, ...result.release } };
  } catch (error) {
    const releaseError = toReleaseError(error);
    logger.warn("Failed to get GitHub releases", { identifier, error: releaseError });
    return failure(releaseError);
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

const ociManifestAccept = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
].join(", ");
const OCI_TAG_PAGE_SIZE = 1000;
const OCI_MAX_TAG_PAGES = 5;
const OCI_MAX_DIGEST_CANDIDATES = 5;

const ociTokenSchema = z.object({ token: z.string() });
const ociTagsSchema = z.object({ tags: z.array(z.string()).nullish() });
const ociManifestSchema = z.object({
  config: z.object({ digest: z.string() }).optional(),
  manifests: z.array(z.object({ digest: z.string() })).optional(),
});
const ociConfigSchema = z.object({
  created: z
    .string()
    .transform((value) => new Date(value))
    .optional(),
  config: z.object({ Labels: z.record(z.string(), z.string()).nullish() }).optional(),
});

interface OciRegistry {
  origin: string;
  host: string;
  repository: string;
  token: string;
}

const requestOciAsync = async (
  registry: OciRegistry,
  path: string,
  init: { method?: string; accept?: string } = {},
) => {
  const response = await fetchProvider(buildUrl(registry.origin, `/v2/${registry.repository}/${path}`), {
    method: init.method,
    headers: { Authorization: `Bearer ${registry.token}`, ...(init.accept ? { Accept: init.accept } : {}) },
  });
  if (!response.ok) throw new ProviderHttpError(response.status, response.statusText);
  return response;
};

const getOciTokenAsync = async (registryUrl: URL, repository: string, token?: string) => {
  const scope = encodeURIComponent(`repository:${repository}:pull`);
  const response = await fetchProvider(
    buildUrl(registryUrl.origin, `/token?service=${registryUrl.host}&scope=${scope}`),
    token ? { headers: { Authorization: `Basic ${Buffer.from(`homarr:${token}`).toString("base64")}` } } : undefined,
  );
  if (!response.ok) throw new ProviderHttpError(response.status, response.statusText);

  const result = ociTokenSchema.safeParse(await response.json());
  if (!result.success) throw new Error(result.error.message);
  return result.data.token;
};

const listOciTagsAsync = async (registry: OciRegistry) => {
  const tags: string[] = [];
  let path: string | undefined = `tags/list?n=${OCI_TAG_PAGE_SIZE}`;
  for (let page = 0; path && page < OCI_MAX_TAG_PAGES; page++) {
    const response = await requestOciAsync(registry, path);
    const result = ociTagsSchema.safeParse(await response.json());
    if (!result.success) throw new Error(result.error.message);
    tags.push(...(result.data.tags ?? []));

    const next = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get("link") ?? "")?.[1];
    path = next ? next.slice(next.indexOf("tags/list")) : undefined;
  }
  return tags;
};

const getOciImageAsync = async (registry: OciRegistry, reference: string) => {
  const response = await requestOciAsync(registry, `manifests/${reference}`, { accept: ociManifestAccept });
  const digest = response.headers.get("docker-content-digest") ?? undefined;
  const manifest = ociManifestSchema.parse(await response.json());
  const platformDigest = manifest.manifests?.[0]?.digest;
  const imageManifest =
    manifest.config || !platformDigest
      ? manifest
      : ociManifestSchema.parse(
          await (await requestOciAsync(registry, `manifests/${platformDigest}`, { accept: ociManifestAccept })).json(),
        );
  const configDigest = imageManifest.config?.digest;
  if (!configDigest) throw new Error("Missing image config digest");

  const config = ociConfigSchema.parse(await (await requestOciAsync(registry, `blobs/${configDigest}`)).json());
  return { digest, createdAt: config.created, labels: config.config?.Labels ?? {} };
};

const getOciDigestAsync = async (registry: OciRegistry, reference: string) => {
  const response = await requestOciAsync(registry, `manifests/${reference}`, {
    method: "HEAD",
    accept: ociManifestAccept,
  });
  return response.headers.get("docker-content-digest") ?? undefined;
};

const findOciFloatingImageAsync = async (registry: OciRegistry) => {
  for (const tag of floatingTagNames) {
    try {
      return { tag, ...(await getOciImageAsync(registry, tag)) };
    } catch (error) {
      if (!(error instanceof ProviderHttpError) || error.status !== 404) throw error;
    }
  }
  return null;
};

const findOciTagWithDigestAsync = async (registry: OciRegistry, candidates: string[], digest: string) => {
  for (const candidate of candidates) {
    try {
      if ((await getOciDigestAsync(registry, candidate)) === digest) return candidate;
    } catch (error) {
      if (!(error instanceof ProviderHttpError) || error.status !== 404) throw error;
    }
  }
  return undefined;
};

const resolveOciFloatingVersionAsync = async (
  registry: OciRegistry,
  image: { tag: string; digest?: string; labels: Record<string, string> },
) => {
  if (!image.digest) return undefined;

  const labelVersion = image.labels["org.opencontainers.image.version"];
  if (labelVersion && labelVersion !== image.tag && isVersionLikeTag(labelVersion)) {
    const labelTags = [labelVersion, ...floatingTagNames.map((tag) => `${tag}-${labelVersion}`)];
    if (await findOciTagWithDigestAsync(registry, labelTags, image.digest)) return labelVersion;
  }

  const versionTags = (await listOciTagsAsync(registry))
    .filter(isPlainVersionTag)
    .toSorted((left, right) => compareVersions(parseVersion(right) ?? [], parseVersion(left) ?? []))
    .slice(0, OCI_MAX_DIGEST_CANDIDATES);
  return await findOciTagWithDigestAsync(registry, versionTags, image.digest);
};

const findNewestOciImageAsync = async (registry: OciRegistry, tags: string[]) => {
  const images = await Promise.all(
    tags.slice(-OCI_MAX_DIGEST_CANDIDATES).map(async (name) => ({ name, ...(await getOciImageAsync(registry, name)) })),
  );
  const [newest] = images.toSorted(
    (left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0),
  );
  if (!newest) throw new ProviderHttpError(404, "No container tags");
  return newest;
};

const getGitHubContainerRegistryReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  const parsed = parseOwnerPackageName(identifier);
  if (!parsed) return failure({ code: "invalidIdentifier", message: `Cannot parse "${identifier}" as owner/package` });

  const repository = `${parsed.owner}/${parsed.name}`;
  try {
    const registryUrl = new URL(baseUrl);
    const registry: OciRegistry = {
      origin: registryUrl.origin,
      host: registryUrl.host,
      repository,
      token: await getOciTokenAsync(registryUrl, repository, token),
    };
    const regex = compileVersionRegex(versionRegex);
    const floatingImage = regex ? null : await findOciFloatingImageAsync(registry);

    let release: ReleaseProviderResponse;
    let labels: Record<string, string> = floatingImage?.labels ?? {};
    if (floatingImage) {
      const version = await resolveOciFloatingVersionAsync(registry, floatingImage);
      release = {
        latestRelease: version ?? floatingImage.tag,
        latestReleaseAt: floatingImage.createdAt ?? new Date(),
        resolvedFromTag: version ? floatingImage.tag : undefined,
      };
    } else {
      const tags = await listOciTagsAsync(registry);
      if (tags.length === 0) {
        return failure({ code: "noReleasesFound", message: `${repository} has no container tags` });
      }
      const tag = regex
        ? pickHighestVersion(tags.filter((name) => regex.test(name)).map((name) => ({ name })))
        : (pickHighestVersion(tags.filter(isPlainVersionTag).map((name) => ({ name }))) ??
          pickHighestVersion(tags.filter(isVersionLikeTag).map((name) => ({ name }))));
      if (!tag && regex) return failure({ code: "noMatchingVersion", message: describeNoMatch(tags, versionRegex) });

      const image = tag
        ? { name: tag.name, ...(await getOciImageAsync(registry, tag.name)) }
        : await findNewestOciImageAsync(registry, tags);
      labels = image.labels;
      release = { latestRelease: image.name, latestReleaseAt: image.createdAt ?? new Date() };
    }

    const sourceRepository = parseGithubRepo(labels["org.opencontainers.image.source"]?.replace(/\.git$/, "") ?? "");
    const projectUrl = `https://github.com/${sourceRepository ?? repository}`;
    return {
      success: true,
      data: {
        projectUrl,
        projectDescription: labels["org.opencontainers.image.description"],
        releaseUrl: `${projectUrl}/pkgs/container/${encodeURIComponent(parsed.name)}`,
        ...release,
      },
    };
  } catch (error) {
    const releaseError = toReleaseError(error);
    logger.warn("Failed to get GitHub container registry releases", { identifier, error: releaseError });
    return failure(releaseError);
  }
};

const DOCKER_HUB_MAX_PAGES = 5;

const dockerHubTagsSchema = z.object({
  next: z.string().nullish(),
  results: z.array(
    z.object({
      name: z.string(),
      last_updated: z.string().nullish(),
      digest: z.string().nullish(),
    }),
  ),
});

const dockerHubDetailsSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  description: z.string().nullish(),
  star_count: z.number().nullish(),
  date_registered: z
    .string()
    .transform((value) => new Date(value))
    .nullish(),
});

const getDockerHubReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  const parsed = identifier.includes("/") ? parseOwnerName(identifier) : { owner: "library", name: identifier };
  if (!parsed) return failure({ code: "invalidIdentifier", message: `Cannot parse "${identifier}"` });

  const relativeUrl: `/${string}` = `/v2/namespaces/${encodeURIComponent(parsed.owner)}/repositories/${encodeURIComponent(parsed.name)}`;
  const init = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  const regex = compileVersionRegex(versionRegex);

  try {
    const tags: RegistryTag[] = [];
    for (let page = 1; page <= DOCKER_HUB_MAX_PAGES; page++) {
      const response = await fetchProvider(buildUrl(baseUrl, `${relativeUrl}/tags?page_size=100&page=${page}`), init);
      if (!response.ok)
        throw new ProviderHttpError(response.status, `Docker Hub ${response.status}: ${response.statusText}`);

      const result = dockerHubTagsSchema.parse(await response.json());
      for (const tag of result.results) {
        if (!tag.last_updated) continue;
        tags.push({ name: tag.name, date: new Date(tag.last_updated), digest: tag.digest ?? undefined });
      }
      if (!result.next || !regex || tags.some((tag) => regex.test(tag.name))) break;
    }

    if (tags.length === 0) return failure({ code: "noReleasesFound", message: `${identifier} has no tags` });
    const selected = selectRegistryTag(tags, regex);
    if (!selected) {
      return failure({
        code: "noMatchingVersion",
        message: describeNoMatch(
          tags.map((tag) => tag.name),
          versionRegex,
        ),
      });
    }

    const details = await getDockerHubDetailsAsync(baseUrl, relativeUrl, init);
    return { success: true, data: { ...details, ...selected } };
  } catch (error) {
    const releaseError = toReleaseError(error);
    logger.warn("Failed to get Docker Hub releases", { identifier, error: releaseError });
    return failure(releaseError);
  }
};

const getDockerHubDetailsAsync = async (
  baseUrl: string,
  relativeUrl: `/${string}`,
  init?: Parameters<typeof fetchProvider>[1],
): Promise<DetailsProviderResponse> => {
  const response = await fetchProvider(buildUrl(baseUrl, `${relativeUrl}/`), init);
  if (!response.ok) return {};

  const result = dockerHubDetailsSchema.safeParse(await response.json());
  if (!result.success) return {};

  const path =
    result.data.namespace === "library" ? `_/${result.data.name}` : `r/${result.data.namespace}/${result.data.name}`;
  return {
    projectUrl: `https://hub.docker.com/${path}`,
    projectDescription: result.data.description ?? undefined,
    createdAt: result.data.date_registered ?? undefined,
    starsCount: result.data.star_count ?? undefined,
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

  const response = await fetchProvider(
    buildUrl(baseUrl, `/api/v4/projects/${encodedIdentifier}/releases?per_page=100`),
    headers["PRIVATE-TOKEN"] ? { headers } : undefined,
  );
  if (!response.ok) {
    return failure({
      code: getHttpErrorCode(response.status),
      message: `GitLab ${response.status}: ${response.statusText}`,
    });
  }

  const result = gitlabReleasesSchema.safeParse(await response.json());
  if (!result.success) return failure({ code: "unexpected", message: result.error.message });
  if (result.data.length === 0) {
    return failure({ code: "noReleasesFound", message: `${identifier} has no GitLab releases` });
  }

  const releases = result.data.reduce<ReleaseProviderResponse[]>((acc, release) => {
    if (!release.released_at) return acc;
    const releaseDate = new Date(release.released_at);
    acc.push({
      latestRelease: release.tag_name,
      latestReleaseAt: releaseDate,
      releaseUrl: release._links?.self,
      releaseDescription: release.description ?? undefined,
      isPreRelease: releaseDate > new Date(),
    });
    return acc;
  }, []);
  const matched = getLatestRelease(releases, versionRegex);
  if ("noMatch" in matched) return failure({ code: "noMatchingVersion", message: matched.noMatch });

  const details = await getGitlabDetailsAsync(baseUrl, encodedIdentifier, token);
  return { success: true, data: { ...details, ...matched.release } };
};

const getGitlabDetailsAsync = async (
  baseUrl: string,
  encodedIdentifier: string,
  token?: string,
): Promise<DetailsProviderResponse> => {
  const headers: Record<string, string> = {};
  if (token) headers["PRIVATE-TOKEN"] = token;

  const response = await fetchProvider(
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
  "dist-tags": z.record(z.string(), z.string()).optional(),
  versions: z.record(z.string(), z.object({ description: z.string().optional() })),
  name: z.string(),
});

const getNpmReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
  token?: string,
): Promise<ReleaseResponse> => {
  if (!identifier) return failure({ code: "invalidIdentifier", message: "Empty npm package name" });

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetchProvider(
    buildUrl(baseUrl, `/${encodeURIComponent(identifier)}`),
    headers.Authorization ? { headers } : undefined,
  );
  if (!response.ok) {
    return failure({
      code: getHttpErrorCode(response.status),
      message: `npm ${response.status}: ${response.statusText}`,
    });
  }

  const result = npmReleasesSchema.safeParse(await response.json());
  if (!result.success) return failure({ code: "unexpected", message: result.error.message });

  const latestTag = versionRegex ? undefined : result.data["dist-tags"]?.latest;
  const releases = result.data.time
    .filter((release) => !latestTag || release.latestRelease === latestTag)
    .map((release) => ({
      ...release,
      releaseUrl: `https://www.npmjs.com/package/${encodeURIComponent(result.data.name)}/v/${encodeURIComponent(release.latestRelease)}`,
      releaseDescription: result.data.versions[release.latestRelease]?.description ?? "",
    }));
  const matched = getLatestRelease(releases, versionRegex);
  if ("noMatch" in matched) return failure({ code: "noMatchingVersion", message: matched.noMatch });

  return { success: true, data: matched.release };
};

const codebergReleasesSchema = z.array(
  z.object({
    tag_name: z.string(),
    published_at: z.string().transform((value) => new Date(value)),
    url: z.string(),
    html_url: z.string().optional(),
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
  if (!parsed) return failure({ code: "invalidIdentifier", message: `Cannot parse "${identifier}" as owner/repo` });

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `token ${token}`;

  const response = await fetchProvider(
    buildUrl(baseUrl, `/api/v1/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}/releases`),
    headers.Authorization ? { headers } : undefined,
  );
  if (!response.ok) {
    return failure({
      code: getHttpErrorCode(response.status),
      message: `Codeberg ${response.status}: ${response.statusText}`,
    });
  }

  const result = codebergReleasesSchema.safeParse(await response.json());
  if (!result.success) return failure({ code: "unexpected", message: result.error.message });
  if (result.data.length === 0) {
    return failure({ code: "noReleasesFound", message: `${identifier} has no Codeberg releases` });
  }

  const releases = result.data.map((tag) => ({
    latestRelease: tag.tag_name,
    latestReleaseAt: tag.published_at,
    releaseUrl: tag.html_url ?? tag.url,
    releaseDescription: tag.body,
    isPreRelease: tag.prerelease,
  }));
  const matched = getLatestRelease(releases, versionRegex);
  if ("noMatch" in matched) return failure({ code: "noMatchingVersion", message: matched.noMatch });

  const details = await getCodebergDetailsAsync(baseUrl, parsed.owner, parsed.name, token);
  return { success: true, data: { ...details, ...matched.release } };
};

const getCodebergDetailsAsync = async (
  baseUrl: string,
  owner: string,
  name: string,
  token?: string,
): Promise<DetailsProviderResponse> => {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `token ${token}`;

  const response = await fetchProvider(
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

const linuxServerIOImagesSchema = z.object({
  data: z.object({ repositories: z.object({ linuxserver: z.array(z.unknown()) }) }),
});

const linuxServerIOImageNameSchema = z.object({ name: z.string() });

const linuxServerIOImageSchema = z.object({
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

// Parse a github.com project URL (as returned by the LSIO registry) into an
// "owner/repo" identifier, or null if it is not a github.com repository URL.
const parseGithubRepo = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const [owner, repo] = parsed.pathname.replace(/^\/+/, "").split("/");
    return owner && repo ? `${owner}/${repo}` : null;
  } catch {
    return null;
  }
};

const getLinuxServerIOReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
): Promise<ReleaseResponse> => {
  const parsed = parseOwnerName(identifier);
  if (!parsed) return failure({ code: "invalidIdentifier", message: `Cannot parse "${identifier}" as owner/name` });

  const response = await fetchProvider(buildUrl(baseUrl, "/api/v1/images"));
  if (!response.ok) {
    return failure({
      code: getHttpErrorCode(response.status),
      message: `LSIO ${response.status}: ${response.statusText}`,
    });
  }

  const result = linuxServerIOImagesSchema.safeParse(await response.json());
  if (!result.success) return failure({ code: "unexpected", message: result.error.message });

  const image = result.data.data.repositories.linuxserver.find(
    (entry) => linuxServerIOImageNameSchema.safeParse(entry).data?.name === parsed.name,
  );
  if (!image) {
    return failure({ code: "notFound", message: `Image "${parsed.name}" not found in LinuxServer.io registry` });
  }
  const parsedImage = linuxServerIOImageSchema.safeParse(image);
  if (!parsedImage.success) return failure({ code: "unexpected", message: parsedImage.error.message });
  const release = parsedImage.data;

  const imageMetadata = {
    projectUrl: release.github_url ?? undefined,
    projectDescription: release.description ?? undefined,
    isArchived: release.deprecated ?? undefined,
    starsCount: release.stars ?? undefined,
  };

  const regex = compileVersionRegex(versionRegex);
  if (!regex || regex.test(release.version)) {
    return {
      success: true,
      data: {
        latestRelease: release.version,
        latestReleaseAt: release.version_timestamp,
        releaseDescription: release.changelog?.[0]?.desc,
        createdAt: release.initial_date ?? undefined,
        ...imageMetadata,
      },
    };
  }

  // LSIO's /api/v1/images only exposes the single latest version, so a filter
  // that does not match it cannot surface an older release (#4351). Delegate to
  // the image's GitHub repository to fetch the real release history while
  // keeping LSIO's own image metadata.
  const githubRepo = release.github_url ? parseGithubRepo(release.github_url) : null;
  if (githubRepo) {
    const githubResult = await getGithubReleaseAsync(getReleaseProviderDefaultUrl("github"), githubRepo, versionRegex);
    if (!githubResult.success) return githubResult;
    return {
      success: true,
      data: {
        ...githubResult.data,
        ...imageMetadata,
        createdAt: release.initial_date ?? githubResult.data.createdAt,
      },
    };
  }

  return failure({
    code: "noMatchingVersion",
    message: `Regex /${versionRegex}/ does not match LSIO version "${release.version}"`,
  });
};

const quayReleasesSchema = z.object({
  description: z.string().nullish(),
  tags: z.record(
    z.string(),
    z.object({ name: z.string(), last_modified: z.string().nullish(), manifest_digest: z.string().nullish() }),
  ),
});

const getQuayReleaseAsync = async (
  baseUrl: string,
  identifier: string,
  versionRegex?: string,
): Promise<ReleaseResponse> => {
  const parsed = parseOwnerName(identifier);
  if (!parsed) return failure({ code: "invalidIdentifier", message: `Cannot parse "${identifier}" as owner/repo` });

  const repositoryPath = `${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;
  const response = await fetchProvider(
    buildUrl(baseUrl, `/api/v1/repository/${repositoryPath}?includeTags=true&includeStats=true`),
  );
  if (!response.ok) {
    return failure({
      code: getHttpErrorCode(response.status),
      message: `Quay ${response.status}: ${response.statusText}`,
    });
  }

  const result = quayReleasesSchema.safeParse(await response.json());
  if (!result.success) return failure({ code: "unexpected", message: result.error.message });

  const tags = Object.values(result.data.tags).reduce<RegistryTag[]>((acc, tag) => {
    if (!tag.name || !tag.last_modified) return acc;
    acc.push({ name: tag.name, date: new Date(tag.last_modified), digest: tag.manifest_digest ?? undefined });
    return acc;
  }, []);
  if (tags.length === 0) return failure({ code: "noReleasesFound", message: `${identifier} has no tags` });

  const selected = selectRegistryTag(tags, compileVersionRegex(versionRegex));
  if (!selected) {
    return failure({
      code: "noMatchingVersion",
      message: describeNoMatch(
        tags.map((tag) => tag.name),
        versionRegex,
      ),
    });
  }

  return {
    success: true,
    data: {
      projectUrl: `https://quay.io/repository/${repositoryPath}`,
      projectDescription: result.data.description ?? undefined,
      releaseUrl: `https://quay.io/repository/${repositoryPath}/tag/${encodeURIComponent(selected.latestRelease)}`,
      ...selected,
    },
  };
};
