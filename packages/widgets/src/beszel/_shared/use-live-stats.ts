"use client";

import { useMemo } from "react";

import { clientApi } from "@homarr/api/client";

export const useLiveStats = (integrationIds: string[], systemId: string, enabled: boolean) => {
  const queryInput = useMemo(
    () => ({
      integrationIds,
      systemId,
      timePeriod: "1m" as const,
      includeDocker: true,
    }),
    [integrationIds, systemId],
  );

  const { data, error } = clientApi.widget.beszel.getSystemStats.useQuery(queryInput, {
    enabled: enabled && systemId !== "",
  });

  return {
    data: data ? { systemStats: data.systemStats, containerStats: data.containerStats } : null,
    error: error ?? (data?.error ? new Error(data.error) : null),
  };
};
