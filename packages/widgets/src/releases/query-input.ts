import { splitToChunksWithNItems } from "@homarr/common";
import type { ReleaseProviderKind } from "@homarr/definitions";

export interface ReleasesRepositoryOption {
  id?: string;
  provider?: ReleaseProviderKind;
  identifier: string;
  name?: string;
  versionFilter?: { prefix?: string; precision: number; suffix?: string };
  iconUrl?: string;
  providerUrl?: string;
  integrationIds?: string[];
}

export interface ReleasesRepositoryNormalized extends ReleasesRepositoryOption {
  id: string;
  integrationIds: string[];
}

export interface ReleasesLatestInput {
  itemId: string | undefined;
  repositories: {
    id: string;
    provider: ReleaseProviderKind;
    identifier: string;
    versionFilter?: { prefix?: string; precision: number; suffix?: string };
    providerUrl?: string;
  }[];
}

export const normalizeReleasesRepositories = (
  repositories: readonly ReleasesRepositoryOption[],
): ReleasesRepositoryNormalized[] =>
  repositories.map((repository, index) => ({
    ...repository,
    id: repository.id || `releases-default-${index}-${repository.provider ?? "none"}-${repository.identifier}`,
    integrationIds: repository.integrationIds ?? [],
  }));

export const getReleasesLatestInputs = (
  itemId: string | undefined,
  repositories: readonly ReleasesRepositoryNormalized[],
): ReleasesLatestInput[] => {
  const groupedRepositories = new Map<ReleaseProviderKind, ReleasesRepositoryNormalized[]>();
  for (const repository of repositories) {
    if (!repository.provider) continue;
    const group = groupedRepositories.get(repository.provider) ?? [];
    group.push(repository);
    groupedRepositories.set(repository.provider, group);
  }

  return [...groupedRepositories.entries()].flatMap(([provider, group]) =>
    splitToChunksWithNItems(group, 5).map((chunk) => ({
      itemId,
      repositories: chunk.map((repository) => ({
        id: repository.id,
        provider,
        identifier: repository.identifier,
        versionFilter: repository.versionFilter,
        providerUrl: repository.providerUrl,
      })),
    })),
  );
};

export const getReleasesLinkedIntegrationIds = (
  integrationIds: readonly string[],
  repositories: readonly ReleasesRepositoryNormalized[],
) =>
  integrationIds.filter((integrationId) =>
    repositories.some((repository) => repository.integrationIds.includes(integrationId)),
  );
