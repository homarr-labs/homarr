import type { ReleaseProviderKind } from "@homarr/definitions";

import type { ReleaseEntryErrorCode } from "./release-entry";
import type { ReleasesVersionFilter } from "./releases-repository";

export interface ReleaseQueryRepository {
  id: string;
  provider: ReleaseProviderKind;
  identifier: string;
  excludePrereleases: boolean;
  versionFilter?: ReleasesVersionFilter;
  providerUrl?: string;
}

interface ReleaseQueryRepositorySource {
  id: string;
  provider: ReleaseProviderKind;
  identifier: string;
  excludePrereleases?: boolean;
  versionFilter?: ReleasesVersionFilter;
  providerUrl?: string;
}

/**
 * Query inputs travel in a GET URL. SuperJSON records every `undefined` property in `meta.values`,
 * and a batch of registry images then exceeds tRPC's URL limit before the request is sent.
 * Omit unset options and send the prerelease flag as a real boolean.
 */
export const toReleaseQueryRepository = (repository: ReleaseQueryRepositorySource): ReleaseQueryRepository => {
  const versionFilter = toVersionFilter(repository.versionFilter);
  const query: ReleaseQueryRepository = {
    id: repository.id,
    provider: repository.provider,
    identifier: repository.identifier,
    excludePrereleases: repository.excludePrereleases ?? false,
  };
  if (versionFilter) query.versionFilter = versionFilter;
  if (repository.providerUrl) query.providerUrl = repository.providerUrl;
  return query;
};

const toVersionFilter = (versionFilter: ReleasesVersionFilter | undefined) => {
  if (!versionFilter) return undefined;
  const query: ReleasesVersionFilter = { precision: versionFilter.precision };
  if (versionFilter.prefix) query.prefix = versionFilter.prefix;
  if (versionFilter.suffix) query.suffix = versionFilter.suffix;
  return query;
};

/** A failed batch never reached the provider. A missing row in a successful batch did. */
export const missingReleaseResultError = (batchFailed: boolean): ReleaseEntryErrorCode =>
  batchFailed ? "unexpected" : "noProviderResponse";
