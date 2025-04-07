import type { ReleaseProvider } from "./release-providers";

export interface ReleaseRepository {
  provider: ReleaseProvider;
  identifier: string;
  versionRegex?: string;
  iconUrl?: string;

  latestRelease?: string;
  latestReleaseAt?: Date;
  isNewRelease: boolean;
  isStaleRelease: boolean;

  releaseUrl?: string;
  releaseDescription?: string;
  isPreRelease?: boolean;

  projectUrl?: string;
  projectDescription?: string;
  isFork?: boolean;
  isArchived?: boolean;
  createdAt?: Date;
  starsCount?: number;
  forksCount?: number;
  openIssues?: number;
}