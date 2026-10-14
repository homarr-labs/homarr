export interface ReleaseRepositoryDisplay {
  id: string;
  identifier: string;
  name?: string;
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
  providerMetadata?: { name: string; iconUrl?: string };
  viewed: boolean;
  error?: { code?: string; message?: string };
}
