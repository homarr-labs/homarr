export interface ReleaseVersionFilter {
  prefix?: string;
  precision: number;
  suffix?: string;
}

export interface ReleaseRepository {
  providerKey: string;
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
