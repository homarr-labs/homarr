import type { ReleaseProviderKind } from "@homarr/definitions";
import { getReleaseProviderDefaultUrl, splitReleaseProviderReference } from "@homarr/definitions";

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
import { compileVersionPattern, isVersionLikeTag } from "./versions";

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
  const reference = splitReleaseProviderReference(request.provider, request.identifier);
  if (!reference.identifier) throw new ReleaseLookupError("invalidIdentifier", "The identifier is empty");
  // Numeric suffixes are the image's current version. Branch names such as nightly or master select a track.
  const tag = reference.tag && !isVersionLikeTag(reference.tag) ? reference.tag : undefined;

  return {
    baseUrl: (request.providerUrl ?? getReleaseProviderDefaultUrl(request.provider)).replace(/\/$/, ""),
    identifier: reference.identifier,
    tag,
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
