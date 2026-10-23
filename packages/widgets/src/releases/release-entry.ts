import type { ReleaseProviderKind } from "@homarr/definitions";

import type { ReleasesRepositoryIntegration } from "./releases-repository";

export type EntryKind = "new" | "outdated" | "error" | "upToDate" | "quiet";

export type ReleaseEntryErrorCode =
  | "invalidIdentifier"
  | "noMatchingVersion"
  | "noReleasesFound"
  | "notFound"
  | "rateLimited"
  | "unexpected"
  | "noProviderSelected"
  | "noProviderResponse";

interface ReleaseEntryBase {
  id: string;
  name: string;
  identifier: string;
  iconUrl?: string;
  provider?: {
    kind: ReleaseProviderKind;
    name: string;
    iconUrl: string;
  };
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
}

export type ReleaseEntry = ReleaseEntryBase &
  ({ kind: "error"; error: { code: ReleaseEntryErrorCode } } | { kind: Exclude<EntryKind, "error"> });
