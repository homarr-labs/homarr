"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { clientApi } from "@homarr/api/client";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

const MAX_BUFFER = 60;

interface LiveStatsData {
  systemStats: BeszelSystemStatsRecord[];
  containerStats: BeszelContainerStatsRecord[];
}

export const useLiveStats = (integrationIds: string[], systemId: string, enabled: boolean) => {
  const [data, setData] = useState<LiveStatsData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const integrationKey = integrationIds.join(",");
  useEffect(() => {
    setData(null);
    setError(null);
  }, [systemId, enabled, integrationKey]);

  const onData = useCallback(
    (incoming: { stats: BeszelSystemStatsRecord; containerStats: BeszelContainerStatsRecord | null }) => {
      setError(null);
      setData((prev) => {
        const systemStats = [...(prev?.systemStats ?? []), incoming.stats].slice(-MAX_BUFFER);
        const containerStats = incoming.containerStats
          ? [...(prev?.containerStats ?? []), incoming.containerStats].slice(-MAX_BUFFER)
          : (prev?.containerStats ?? []);
        return { systemStats, containerStats };
      });
    },
    [],
  );

  const onError = useCallback((err: unknown) => {
    setData(null);
    setError(err instanceof Error ? err : new Error(String(err)));
  }, []);

  const subscriptionInput = useMemo(() => ({ integrationIds, systemId }), [integrationKey, systemId]);
  const subscriptionEnabled = enabled && systemId !== "";

  clientApi.widget.beszel.subscribeSystemStats.useSubscription(subscriptionInput, {
    enabled: subscriptionEnabled,
    onData,
    onError,
  });

  return { data, error };
};
