import { escapeForRegEx } from "@tiptap/react";

import type {
  DetailsProviderResponse,
  ReleaseProviderResponse,
  ReleasesRepository,
  ReleasesResponse,
  ReleasesVersionFilter,
} from "./releases-providers-types";

const formatVersionFilterRegex = (versionFilter: ReleasesVersionFilter | undefined) => {
  if (!versionFilter) return undefined;

  const escapedPrefix = versionFilter.prefix ? escapeForRegEx(versionFilter.prefix) : "";
  const precision = "[0-9]+\\.".repeat(versionFilter.precision).slice(0, -2);
  const escapedSuffix = versionFilter.suffix ? escapeForRegEx(versionFilter.suffix) : "";

  return `^${escapedPrefix}${precision}${escapedSuffix}$`;
};

export const getLatestRelease = (
  releases: ReleaseProviderResponse[],
  repository: ReleasesRepository,
  details: DetailsProviderResponse | undefined,
): ReleasesResponse => {
  const validReleases = releases.filter((result) => {
    if (result.latestRelease) {
      const versionRegex = formatVersionFilterRegex(repository.versionFilter);
      return versionRegex ? new RegExp(versionRegex).test(result.latestRelease) : true;
    }

    return true;
  });

  const latest =
    validReleases.length === 0
      ? {
          identifier: repository.identifier,
          providerKey: repository.providerKey,
          error: { code: "noMatchingVersion" },
        }
      : validReleases.reduce(
          (latest, result) => {
            return {
              ...details,
              ...(result.latestReleaseAt > latest.latestReleaseAt ? result : latest),
              identifier: repository.identifier,
              providerKey: repository.providerKey,
            };
          },
          {
            identifier: "",
            providerKey: "",
            latestRelease: "",
            latestReleaseAt: new Date(0),
          },
        );

  return latest;
};

export interface ReleasesProviderIntegration {
  getReleasesAsync(repositories: ReleasesRepository[]): Promise<ReleasesResponse[]>;
}
