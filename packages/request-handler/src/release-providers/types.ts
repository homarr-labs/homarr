import type { ReleaseProviderKind } from "@homarr/definitions";

export interface ReleasesRepositoryRequest extends Record<string, unknown> {
  id: string;
  provider: ReleaseProviderKind;
  identifier: string;
  versionRegex?: string;
  providerUrl?: string;
  token?: string;
}

export interface ProjectDetails {
  projectUrl?: string;
  projectDescription?: string;
  isFork?: boolean;
  isArchived?: boolean;
  createdAt?: Date;
  starsCount?: number;
  openIssues?: number;
  forksCount?: number;
}

export interface Release {
  latestRelease: string;
  latestReleaseAt: Date;
  resolvedFromTag?: string;
  releaseUrl?: string;
  releaseDescription?: string;
  isPreRelease?: boolean;
}

export type ReleaseData = ProjectDetails & Release;

export type ReleaseErrorCode =
  | "invalidIdentifier"
  | "noMatchingVersion"
  | "noReleasesFound"
  | "notFound"
  | "rateLimited"
  | "unexpected";

export interface ReleaseError {
  code: ReleaseErrorCode;
  message: string;
}

export type ReleaseResponse = { success: true; data: ReleaseData } | { success: false; error: ReleaseError };

export interface ReleaseLookup {
  baseUrl: string;
  identifier: string;
  versionPattern?: RegExp;
  token?: string;
}

export type ReleaseProvider = (lookup: ReleaseLookup) => Promise<ReleaseData>;
