"use client";

import { useMemo } from "react";

import { clientApi } from "@homarr/api/client";

import type { SmartHomeCatalogIndex } from "./catalog-index";
import { createSmartHomeCatalogIndex } from "./catalog-index";

export type SmartHomeCatalogState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: { message: string }; retry: () => void }
  | { status: "ready"; index: SmartHomeCatalogIndex; isRefreshing: boolean; refresh: () => void };

export const useSmartHomeCatalog = (integrationId: string | null | undefined): SmartHomeCatalogState => {
  const enabled = typeof integrationId === "string" && integrationId.length > 0;
  const query = clientApi.widget.smartHome.catalog.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled, staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 },
  );
  const index = useMemo(() => (query.data ? createSmartHomeCatalogIndex(query.data) : null), [query.data]);
  const refetch = () => void query.refetch();

  if (!enabled) return { status: "idle" };
  if (index) return { status: "ready", index, isRefreshing: query.isFetching, refresh: refetch };
  if (query.error) return { status: "error", error: query.error, retry: refetch };
  return { status: "loading" };
};
