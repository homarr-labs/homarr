"use client";

import { useEffect } from "react";

import { clientApi } from "@homarr/api/client";
import { queryCacheDefaultStaleTimeMs } from "@homarr/api/query-cache";
import { useSession } from "@homarr/auth/client";

import { spotlightOpenEvent } from "../open";

const catalogQueryOptions = (enabled = true) => ({
  enabled,
  refetchOnWindowFocus: false,
  staleTime: queryCacheDefaultStaleTimeMs,
});

export const useAppsCatalogQuery = (enabled = true) => {
  const { status } = useSession();
  return clientApi.app.selectable.useQuery(undefined, catalogQueryOptions(enabled && status === "authenticated"));
};

export const useBoardsCatalogQuery = () => {
  const { status } = useSession();
  return clientApi.board.catalog.useQuery(undefined, catalogQueryOptions(status !== "loading"));
};

export const useIntegrationsCatalogQuery = (enabled = true) => {
  const { status } = useSession();
  return clientApi.integration.all.useQuery(undefined, catalogQueryOptions(enabled && status === "authenticated"));
};

export const useSearchEnginesCatalogQuery = () => {
  const { status } = useSession();
  return clientApi.searchEngine.catalog.useQuery(undefined, catalogQueryOptions(status !== "loading"));
};

export const useSpotlightCatalogs = () => {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const isSessionResolved = status !== "loading";
  const canBrowseApps =
    session?.user.permissions.includes("board-modify-all") === true ||
    session?.user.permissions.includes("app-modify-all") === true;

  const appsQuery = useAppsCatalogQuery(isAuthenticated && canBrowseApps);
  const boardsQuery = useBoardsCatalogQuery();
  const integrationsQuery = useIntegrationsCatalogQuery(isAuthenticated);
  const searchEnginesQuery = useSearchEnginesCatalogQuery();

  useEffect(() => {
    const refreshCatalogs = () => {
      if (canBrowseApps) void appsQuery.refetch();
      if (isSessionResolved) void boardsQuery.refetch();
      if (isAuthenticated) void integrationsQuery.refetch();
      if (isSessionResolved) void searchEnginesQuery.refetch();
    };

    window.addEventListener(spotlightOpenEvent, refreshCatalogs);
    return () => window.removeEventListener(spotlightOpenEvent, refreshCatalogs);
  }, [
    appsQuery,
    boardsQuery,
    canBrowseApps,
    integrationsQuery,
    isAuthenticated,
    isSessionResolved,
    searchEnginesQuery,
  ]);
};

export const filterCatalog = <TOption>(
  options: TOption[],
  query: string,
  getSearchableValues: (option: TOption) => string[],
  limit = 8,
) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) return options.slice(0, limit);

  const matches: [TOption[], TOption[], TOption[]] = [[], [], []];
  let bucketLimit = limit;
  if (limit < 0) bucketLimit = Number.POSITIVE_INFINITY;

  for (const option of options) {
    let score = 3;
    for (const value of getSearchableValues(option)) {
      const normalizedValue = value.toLowerCase();
      if (normalizedValue === normalizedQuery) {
        score = 0;
        break;
      }
      if (normalizedValue.startsWith(normalizedQuery)) score = Math.min(score, 1);
      else if (normalizedValue.includes(normalizedQuery)) score = Math.min(score, 2);
    }

    // Each relevance bucket preserves catalog order; later entries cannot enter its visible slice.
    const bucket = matches[score];
    if (bucket && bucket.length < bucketLimit) bucket.push(option);
  }

  return matches.flat().slice(0, limit);
};
