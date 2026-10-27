"use client";

import { useCallback, useMemo } from "react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { getReleaseProviderIconUrl, getReleaseProviderName } from "@homarr/definitions";

import { isInitialWidgetQueryPending } from "../common/query-state";
import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { getEntryKind } from "./display";
import { getRowIntegrationVersions } from "./integration-version";
import { getReleasesQueryStaleTimeMs } from "./query-options";
import type { ReleaseEntry, ReleaseEntryErrorCode } from "./release-entry";
import { useViewedReleases } from "./use-viewed-releases";
import { definition } from ".";
import { normalizeReleasesRepositories } from "./query-input";

export const useReleaseEntries = ({
  options,
  itemId,
  boardId,
  integrationIds,
  widgetRuntimeRef,
}: Pick<WidgetComponentProps<"releases">, "options" | "itemId" | "integrationIds" | "widgetRuntimeRef"> & {
  boardId: string;
}) => {
  const repositories = useMemo(() => normalizeReleasesRepositories(options.repositories), [options.repositories]);
  const { viewedVersions, markViewed: markVersionViewed } = useViewedReleases(itemId, repositories);
  const inputs = definition.data.queries({
    options,
    integrationIds,
    itemId,
    board: { id: boardId, disableStatus: true },
  });
  const queries = clientApi.useQueries((trpc) =>
    inputs.latest.map(({ input }) => trpc.widget.releases.getLatest(input, { staleTime: getReleasesQueryStaleTimeMs })),
  );
  const serviceVersionsInput = inputs.services.input;
  const linkedIntegrationIds = serviceVersionsInput.integrationIds;
  const serviceVersionsQuery = clientApi.widget.releases.getServiceVersions.useQuery(serviceVersionsInput, {
    enabled: linkedIntegrationIds.length > 0,
  });
  const runtimeQueries = useMemo(() => {
    if (linkedIntegrationIds.length === 0) return [];
    return [getQueryKey(clientApi.widget.releases.getServiceVersions, serviceVersionsInput, "query")];
  }, [linkedIntegrationIds.length, serviceVersionsInput]);
  useWidgetRuntimeQueries(widgetRuntimeRef, runtimeQueries);

  const isInitialLoading = queries.some(isInitialWidgetQueryPending);
  const isFetching = queries.some((query) => query.isFetching);
  const results = useMemo(() => queries.flatMap((query) => query.data ?? []), [queries]);
  const serviceVersions = useMemo(() => serviceVersionsQuery.data ?? [], [serviceVersionsQuery.data]);

  const entries = useMemo(() => {
    const resultById = new Map(results.map((result) => [result.id, result]));

    return repositories.map((repository): ReleaseEntry => {
      const base = {
        id: repository.id,
        name: repository.name?.trim() || repository.identifier,
        identifier: repository.identifier,
        iconUrl: repository.iconUrl,
        provider: repository.provider && {
          kind: repository.provider,
          name: getReleaseProviderName(repository.provider),
          iconUrl: getReleaseProviderIconUrl(repository.provider),
        },
        isViewed: false,
        integrations: [],
      };

      const errorEntry = (code: ReleaseEntryErrorCode): ReleaseEntry => ({ ...base, kind: "error", error: { code } });

      if (!repository.provider) return errorEntry("noProviderSelected");
      const result = resultById.get(repository.id);
      if (!result) return errorEntry("noProviderResponse");
      if (!result.success) return errorEntry(result.error.code);

      const { data } = result;
      const isViewed = viewedVersions[repository.id] === data.latestRelease;
      const integrations = getRowIntegrationVersions(
        repository.integrationIds,
        integrationIds,
        serviceVersions,
        data.latestRelease,
      );
      return {
        ...base,
        kind: getEntryKind({ publishedAt: data.latestReleaseAt, isViewed, integrations }, options),
        isViewed,
        version: data.latestRelease,
        resolvedFromTag: data.resolvedFromTag,
        publishedAt: data.latestReleaseAt,
        isPreRelease: data.isPreRelease,
        releaseUrl: data.releaseUrl,
        releaseNotes: data.releaseDescription,
        projectUrl: data.projectUrl,
        projectDescription: data.projectDescription,
        createdAt: data.createdAt,
        isArchived: data.isArchived,
        isFork: data.isFork,
        starsCount: data.starsCount,
        forksCount: data.forksCount,
        openIssues: data.openIssues,
        integrations,
      };
    });
  }, [integrationIds, options, repositories, results, serviceVersions, viewedVersions]);

  const markViewed = useCallback(
    (entry: ReleaseEntry) => {
      const { version } = entry;
      if (!version) return;
      markVersionViewed(entry.id, version);
    },
    [markVersionViewed],
  );

  const markAllViewed = useCallback(
    (entriesToMark: ReleaseEntry[]) => {
      for (const entry of entriesToMark) {
        if (entry.version) markVersionViewed(entry.id, entry.version);
      }
    },
    [markVersionViewed],
  );

  return { entries, isInitialLoading, isFetching, serviceVersionsQuery, markViewed, markAllViewed };
};
