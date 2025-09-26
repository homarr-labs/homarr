import type {
  DetailedRelease,
  ErrorResponse,
  ParsedIdentifier,
  ReleaseProviderResponse,
} from "./releases-providers-types";

export const getLatestRelease = (
  releases: ReleaseProviderResponse[],
  versionRegex?: string,
): ReleaseProviderResponse | null => {
  const validReleases = releases.filter((result) => {
    if (result.latestRelease) {
      return versionRegex ? new RegExp(versionRegex).test(result.latestRelease) : true;
    }
    return true;
  });

  return validReleases.length === 0
    ? null
    : validReleases.reduce((latest, current) => (current.latestReleaseAt > latest.latestReleaseAt ? current : latest));
};

export interface ReleasesProviderIntegration {
  parseIdentifier(identifier: string): ParsedIdentifier | null;
  getLatestMatchingReleaseAsync(
    identifier: ParsedIdentifier,
    versionRegex?: string,
  ): Promise<DetailedRelease | ErrorResponse | null>;
}
