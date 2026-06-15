"use client";

import { useCallback, useEffect, useState } from "react";

import { clientApi } from "@homarr/api/client";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

const MAX_BUFFER = 60;

interface LiveStatsData {
  systemStats: BeszelSystemStatsRecord[];
  containerStats: BeszelContainerStatsRecord[];
}

export const useLiveStats = (integrationIds: string[], systemId: string, enabled: boolean) => {
  const [data, setData] = useState<LiveStatsData | null>(null);

  const integrationKey = integrationIds.join(",");
  useEffect(() => {
    setData(null);
  }, [systemId, enabled, integrationKey]);

  const onData = useCallback(
    (incoming: { stats: BeszelSystemStatsRecord; containerStats: BeszelContainerStatsRecord | null }) => {
      setData((prev) => {
        const systemStats = [...(prev?.systemStats ?? []), incoming.stats].slice(-MAX_BUFFER);
        const containerStats = incoming.containerStats
          ? [...(prev?.containerStats ?? []), incoming.containerStats].slice(-MAX_BUFFER)
          : prev?.containerStats ?? [];
        return { systemStats, containerStats };
      });
    },
    [],
  );

  clientApi.widget.beszel.subscribeSystemStats.useSubscription(
    { integrationIds, systemId },
    { enabled: enabled && systemId !== "", onData },
  );

  return data;
};
