import type { ReleaseProviderKind } from "@homarr/definitions";

import type { ReleasesRepositoryIntegration } from "./releases-repository";

export type ReleaseEntryStatus = "new" | "current" | "stale" | "error";

export type ReleaseEntryErrorCode =
  | "invalidIdentifier"
  | "noMatchingVersion"
  | "noReleasesFound"
  | "notFound"
  | "rateLimited"
  | "unexpected"
  | "noProviderSelected"
  | "noProviderResponse";

export interface ReleaseEntry {
  id: string;
  name: string;
  identifier: string;
  iconUrl?: string;
  provider?: {
    kind: ReleaseProviderKind;
    name: string;
    iconUrl: string;
  };
  status: ReleaseEntryStatus;
  isViewed: boolean;
  version?: string;
  resolvedFromTag?: string;
  publishedAt?: Date;
  isPreRelease?: boolean;
  releaseUrl?: string;
  releaseNotes?: string;
  projectUrl?: string;
  projectDescription?: string;
  isArchived?: boolean;
  isFork?: boolean;
  starsCount?: number;
  forksCount?: number;
  openIssues?: number;
  integrations: ReleasesRepositoryIntegration[];
  error?: { code: ReleaseEntryErrorCode };
}
