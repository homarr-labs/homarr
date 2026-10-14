"use client";

import { useCallback, useMemo, useState } from "react";
import { useLocalStorage } from "@mantine/hooks";
import { useFormatter, useNow } from "next-intl";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { createId, isDateWithin, isNullOrWhitespace, splitToChunksWithNItems } from "@homarr/common";
import type { ReleaseProviderKind } from "@homarr/definitions";
import { getReleaseProviderIconUrl, getReleaseProviderName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { selectReleaseRepositoriesForDisplay } from "./display";
import type { ReleasesRepository, ReleasesRepositoryResponse } from "./releases-repository";
import { getReleasesQueryStaleTimeMs } from "./query-options";
import { ReleasesNativeView } from "./native-view";

const formatRelativeDate = (value: string): string => {
  const isMonths = /\d+m/g.test(value);
  const isOtherUnits = /\d+[HDWY]/g.test(value);
  return isMonths ? value.toUpperCase() : isOtherUnits ? value.toLowerCase() : value;
};

export default function ReleasesWidget({ options, itemId, width, displayMode }: WidgetComponentProps<"releases">) {
  const t = useI18n("widget.releases");
  const now = useNow();
  const formatter = useFormatter();
  const board = useRequiredBoard();
  const [expandedRepositoryId, setExpandedRepositoryId] = useState<string | null>(null);
  const hasIconColor = useMemo(() => board.iconColor !== null, [board.iconColor]);
  const [releasesViewedList, setReleasesViewedList] = useLocalStorage<Record<string, string>>({
    key: "releases-viewed-versions",
    defaultValue: {},
  });
  const isAdvanced = displayMode === "advanced";
  const columns = isAdvanced ? Math.max(1, Math.floor(width / 420)) : 1;
  const relativeDateOptions = useMemo(
    () => ({
      newReleaseWithin: formatRelativeDate(options.newReleaseWithin),
      staleReleaseWithin: formatRelativeDate(options.staleReleaseWithin),
    }),
    [options.newReleaseWithin, options.staleReleaseWithin],
  );
  const normalizedRepositories = useMemo(
    () => options.repositories.map((repo) => (repo.id ? repo : { ...repo, id: createId() })),
    [options.repositories],
  );
  const groupedRepositories = useMemo(
    () =>
      normalizedRepositories.reduce(
        (acc, repo) => {
          const key = repo.provider;
          if (!key) return acc;
          acc[key] ??= [];
          acc[key].push(repo);
          return acc;
        },
        {} as Partial<Record<ReleaseProviderKind, ReleasesRepository[]>>,
      ),
    [normalizedRepositories],
  );
  const batchedRepositories = useMemo(
    () =>
      Object.entries(groupedRepositories).flatMap(([provider, group]) =>
        splitToChunksWithNItems(group, 5).map((chunk) => ({
          provider: provider as ReleaseProviderKind,
          repositories: chunk,
        })),
      ),
    [groupedRepositories],
  );
  const queryResults = clientApi.useQueries((trpc) =>
    batchedRepositories.flatMap(({ provider, repositories }) =>
      trpc.widget.releases.getLatest(
        {
          itemId,
          repositories: repositories.map((repository) => ({
            id: repository.id,
            provider,
            identifier: repository.identifier,
            versionFilter: repository.versionFilter,
            providerUrl: repository.providerUrl,
          })),
        },
        { staleTime: getReleasesQueryStaleTimeMs },
      ),
    ),
  );
  const results = useMemo(
    () => queryResults.map((q) => q.data).filter((d): d is NonNullable<typeof d> => d != null),
    [queryResults],
  );
  const isInitialLoading = queryResults.some(isInitialWidgetQueryPending);
  const repositories = useMemo(() => {
    const resultById = new Map(results.flat().map((result) => [result.id, result]));
    const formattedResults = normalizedRepositories
      .map((repository) => {
        if (!repository.provider) return { ...repository, error: { code: "noProviderSelected" } };
        const repositoryResult = resultById.get(repository.id);
        if (!repositoryResult) return { ...repository, error: { code: "noProviderResponse" } };
        if (!repositoryResult.success) return { ...repository, error: repositoryResult.error };
        const { data: release, provider } = repositoryResult;
        const isReleaseWithin = (relativeDate: string) =>
          Boolean(relativeDate) && isDateWithin(release.latestReleaseAt, relativeDate);
        return {
          ...repository,
          ...release,
          providerMetadata: { name: getReleaseProviderName(provider), iconUrl: getReleaseProviderIconUrl(provider) },
          isNewRelease: isReleaseWithin(relativeDateOptions.newReleaseWithin),
          isStaleRelease: !isReleaseWithin(relativeDateOptions.staleReleaseWithin),
          viewed: releasesViewedList[repository.id] === release.latestRelease,
        };
      })
      .toSorted((repoA, repoB) => {
        if ("error" in repoA) return -1;
        if ("error" in repoB) return 1;
        return repoA.latestReleaseAt > repoB.latestReleaseAt ? -1 : 1;
      }) as ReleasesRepositoryResponse[];
    return selectReleaseRepositoriesForDisplay(formattedResults, {
      displayMode,
      showOnlyHighlighted: options.showOnlyHighlighted,
      topReleases: options.topReleases,
    });
  }, [
    displayMode,
    results,
    normalizedRepositories,
    options.showOnlyHighlighted,
    options.topReleases,
    relativeDateOptions.newReleaseWithin,
    relativeDateOptions.staleReleaseWithin,
    releasesViewedList,
  ]);
  const toggleExpandedDisplay = useCallback(
    (repository: ReleasesRepositoryResponse) =>
      setExpandedRepositoryId(expandedRepositoryId === repository.id ? null : repository.id),
    [expandedRepositoryId],
  );
  const markReleaseViewed = useCallback(
    (repository: ReleasesRepositoryResponse) => {
      repository.viewed = true;
      setReleasesViewedList((prev) => ({ ...prev, [repository.id]: repository.latestRelease ?? "" }));
    },
    [setReleasesViewedList],
  );
  if (isInitialLoading) return <WidgetQueryLoadingState />;
  if (repositories.length === 0) return <WidgetEmptyState />;
  return (
    <ReleasesNativeView
      repositories={repositories}
      options={options}
      expandedRepositoryId={expandedRepositoryId}
      hasIconColor={hasIconColor}
      isAdvanced={isAdvanced}
      columns={columns}
      toggleExpandedDisplay={toggleExpandedDisplay}
      markReleaseViewed={markReleaseViewed}
      t={t}
      now={now}
      formatter={formatter}
      renderImage={(props) => <MaskedOrNormalImage {...props} />}
      formatError={(repository) =>
        repository.error?.code ? t(`error.messages.${repository.error.code}` as never) : t("error.messages.unexpected")
      }
      isNullOrWhitespace={isNullOrWhitespace}
    />
  );
}
