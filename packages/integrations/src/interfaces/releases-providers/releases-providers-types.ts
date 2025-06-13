import type { TranslationObject } from "@homarr/translation";

export interface ReleasesVersionFilter {
  prefix?: string;
  precision: number;
  suffix?: string;
}

export interface DetailsProviderResponse {
  projectUrl?: string;
  projectDescription?: string;
  isFork?: boolean;
  isArchived?: boolean;
  createdAt?: Date;
  starsCount?: number;
  openIssues?: number;
  forksCount?: number;
}

export interface ReleaseProviderResponse {
  latestRelease: string;
  latestReleaseAt: Date;
  releaseUrl?: string;
  releaseDescription?: string;
  isPreRelease?: boolean;
}

export interface ReleasesRepository {
  providerKey: string;
  identifier: string;
  versionFilter?: ReleasesVersionFilter;
}

type ReleasesErrorKeys = keyof TranslationObject["widget"]["releases"]["error"]["messages"];

export interface ReleasesResponse {
  identifier: string;
  providerKey: string;
  latestRelease?: string;
  latestReleaseAt?: Date;
  releaseUrl?: string;
  releaseDescription?: string;
  isPreRelease?: boolean;
  projectUrl?: string;
  projectDescription?: string;
  isFork?: boolean;
  isArchived?: boolean;
  createdAt?: Date;
  starsCount?: number;
  openIssues?: number;
  forksCount?: number;
  error?:
    | {
        code: ReleasesErrorKeys;
      }
    | {
        message: string;
      };
}
