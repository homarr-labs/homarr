import type { ReleaseProvider } from "./release-providers";

export interface ReleaseVersionFilter {
  prefix?: string;
  precision: number;
  suffix?: string;
  regex?: string;
}

export interface ReleaseRepository {
  provider: ReleaseProvider;
  identifier: string;
  versionFilter?: ReleaseVersionFilter;
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
