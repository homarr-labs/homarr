import type {
  DetailsProviderResponse,
  ReleaseProviderResponse,
  ReleasesRepository,
  ReleasesResponse,
} from "./releases-providers-types";

export const getLatestRelease = (
  releases: ReleaseProviderResponse[],
  repository: ReleasesRepository,
  details?: DetailsProviderResponse,
): ReleasesResponse => {
  const validReleases = releases.filter((result) => {
    if (result.latestRelease) {
      return repository.versionRegex ? new RegExp(repository.versionRegex).test(result.latestRelease) : true;
    }

    return true;
  });

  const latest =
    validReleases.length === 0
      ? ({
          id: repository.id,
          error: { code: "noMatchingVersion" },
        } as ReleasesResponse)
      : validReleases.reduce(
          (latest, result) => {
            return {
              ...details,
              ...(result.latestReleaseAt > latest.latestReleaseAt ? result : latest),
              id: repository.id,
            };
          },
          {
            id: "",
            latestRelease: "",
            latestReleaseAt: new Date(0),
          },
        );

  return latest;
};

export interface ReleasesProviderIntegration {
  getReleaseAsync(repository: ReleasesRepository): Promise<ReleasesResponse>;
}
