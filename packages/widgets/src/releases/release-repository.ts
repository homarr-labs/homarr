import type { ReleaseProvider } from "./release-providers";

export class ReleaseRepository {
  provider: ReleaseProvider;
  identifier: string;
  versionRegex: string | undefined;
  iconUrl: string | undefined;

  latestRelease: string | undefined;
  latestReleaseAt: Date | undefined;
  shouldHighlight: boolean;

  releaseUrl: string | undefined;
  releaseDescription: string | undefined;
  isPreRelease: boolean | undefined;

  projectUrl: string | undefined;
  projectDescription: string | undefined;
  isFork: boolean | undefined;
  isArchived: boolean | undefined;
  createdAt: Date | undefined;
  starsCount: number | undefined;
  forksCount: number | undefined;
  openIssues: number | undefined;

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
    this.shouldHighlight = false;
  }

  with(details: Partial<ReleaseRepository>): ReleaseRepository {
    return Object.assign(new ReleaseRepository(this.provider, this.identifier, this.versionRegex, this.iconUrl), this, details);
  }

  updateDetails(details: Partial<ReleaseRepository>): void {
    Object.assign(this, details);
  }
}
