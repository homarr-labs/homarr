import type { IntegrationKind, ReleaseProviderKind } from "@homarr/definitions";

export interface ReleasesVersionFilter {
  prefix?: string;
  precision: number;
  suffix?: string;
}

export interface ReleasesRepository {
  id: string;
  provider?: ReleaseProviderKind;
  identifier: string;
  name?: string;
  versionFilter?: ReleasesVersionFilter;
  iconUrl?: string;
  providerUrl?: string;
  integrationIds?: string[];
}

export interface ReleasesRepositoryIntegration {
  id: string;
  kind: IntegrationKind;
  name: string;
  version: string;
  /** Undefined when either version has an unsupported format. */
  isUpToDate: boolean | undefined;
}

export interface ReleasesRepositoryResponse extends ReleasesRepository {
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

  providerMetadata?: {
    name: string;
    iconUrl?: string;
  };

  viewed: boolean;

  integrations?: ReleasesRepositoryIntegration[];

  error?: { code?: string; message?: string };
}
