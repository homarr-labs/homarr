import type { TranslationObject } from "@homarr/translation";

export interface ParsedIdentifier {
  owner: string;
  name: string;
}

export interface ReleasesRepository {
  id: string;
  identifier: string;
  versionRegex?: string;
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

type ReleasesErrorKeys = keyof TranslationObject["widget"]["releases"]["error"]["messages"];

export type ErrorResponse = { code: ReleasesErrorKeys } | { message: string };

export type DetailedRelease = DetailsProviderResponse & ReleaseProviderResponse;

export type ReleasesResponse = { id: string } & (DetailedRelease | { error: ErrorResponse });
