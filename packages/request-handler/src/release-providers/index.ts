import type { ReleaseProviderKind } from "@homarr/definitions";
import { getReleaseProviderDefaultUrl, splitReleaseProviderReference, isVersionLikeTag } from "@homarr/definitions";

import { getCodebergReleaseAsync } from "./codeberg";
import { getDockerHubReleaseAsync } from "./docker-hub";
import { ReleaseLookupError, toReleaseError } from "./errors";
import { getGithubReleaseAsync } from "./github";
import { getGitHubContainerRegistryReleaseAsync } from "./github-container-registry";
import { getGitlabReleaseAsync } from "./gitlab";
import { getLinuxServerReleaseAsync } from "./linuxserver";
import { getNpmReleaseAsync } from "./npm";
import { getQuayReleaseAsync } from "./quay";
import type { ReleaseLookup, ReleaseProvider, ReleaseResponse, ReleasesRepositoryRequest } from "./types";
import { compileVersionPattern } from "./versions";

export type * from "./types";

const releaseProviders: Record<ReleaseProviderKind, ReleaseProvider> = {
  github: getGithubReleaseAsync,
  gitHubContainerRegistry: getGitHubContainerRegistryReleaseAsync,
  dockerHub: getDockerHubReleaseAsync,
  gitlab: getGitlabReleaseAsync,
  npm: getNpmReleaseAsync,
  codeberg: getCodebergReleaseAsync,
  linuxServerIO: getLinuxServerReleaseAsync,
  quay: getQuayReleaseAsync,
};

const createLookup = (request: ReleasesRepositoryRequest): ReleaseLookup => {
  const { identifier, tag } = splitReleaseProviderReference(request.provider, request.identifier);
  if (!identifier) throw new ReleaseLookupError("invalidIdentifier", "The identifier is empty");
  if (request.provider === "linuxServerIO" && tag && tag !== "latest" && !isVersionLikeTag(tag)) {
    throw new ReleaseLookupError(
      "invalidIdentifier",
      "LinuxServer.io does not support explicit tracks. Use Docker Hub or GHCR for tagged images.",
    );
  }

  return {
    baseUrl: (request.providerUrl ?? getReleaseProviderDefaultUrl(request.provider)).replace(/\/$/, ""),
    identifier,
    tag: tag && !isVersionLikeTag(tag) ? tag : undefined,
    versionPattern: compileVersionPattern(request.versionRegex),
    excludePrereleases: request.excludePrereleases,
    token: request.token,
  };
};

export const getLatestMatchingReleaseAsync = async (request: ReleasesRepositoryRequest): Promise<ReleaseResponse> => {
  try {
    const data = await releaseProviders[request.provider](createLookup(request));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: toReleaseError(error) };
  }
};
