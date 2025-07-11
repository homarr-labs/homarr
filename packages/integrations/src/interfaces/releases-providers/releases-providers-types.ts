import type { TranslationObject } from "@homarr/translation";

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
  id: string;
  identifier: string;
  versionRegex?: string;
}

type ReleasesErrorKeys = keyof TranslationObject["widget"]["releases"]["error"]["messages"];

export interface ReleasesResponse {
  id: string;
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
