"use client";

import { clientApi } from "@homarr/api/client";

export const useLiveStats = (integrationIds: string[], systemId: string, enabled: boolean) => {
  const { data, error } = clientApi.widget.beszel.getSystemStats.useQuery(
    { integrationIds, systemId, timePeriod: "1m" as const, includeDocker: true },
    { enabled: enabled && systemId !== "", refetchInterval: 5_000 },
  );

  return {
    data: data ? { systemStats: data.systemStats, containerStats: data.containerStats } : null,
    error: error ?? (data?.error ? new Error(data.error) : null),
  };
};
