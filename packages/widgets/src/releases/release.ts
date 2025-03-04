import type { ReleaseProvider } from "./release-providers";

export class Release {
  provider: ReleaseProvider;
  identifier: string;
  versionRegex: string | undefined;
  iconUrl: string | undefined;
  latestRelease: string | undefined;
  latestReleaseDate: Date | undefined;

  constructor(
    provider: ReleaseProvider,
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
