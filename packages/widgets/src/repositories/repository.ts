import type { RepositoryProvider } from "./repository-providers";

export class Repository {
  provider: RepositoryProvider;
  identifier: string;
  versionRegex: string | undefined;
  iconUrl: string | undefined;
  latestRelease: string | undefined;
  latestReleaseDate: Date | undefined;

  constructor(
    provider: RepositoryProvider,
    identifier: string,
    versionRegex: string | undefined = undefined,
    iconUrl: string | undefined = undefined,
  ) {
    this.provider = provider;
    this.identifier = identifier;
    this.versionRegex = versionRegex;
    this.iconUrl = iconUrl;
  }
}
