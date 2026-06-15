"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

const MAX_BUFFER = 60;

interface LiveStatsData {
  systemStats: BeszelSystemStatsRecord[];
  containerStats: BeszelContainerStatsRecord[];
}

export const useLiveStats = (integrationIds: string[], systemId: string, includeDocker: boolean, enabled: boolean) => {
  const bufferRef = useRef<LiveStatsData>({ systemStats: [], containerStats: [] });
  const [data, setData] = useState<LiveStatsData | null>(null);

  useEffect(() => {
    bufferRef.current = { systemStats: [], containerStats: [] };
    setData(null);
  }, [systemId, enabled, ...integrationIds]);

  const onData = useCallback(
    (incoming: { stats: BeszelSystemStatsRecord; containerStats: BeszelContainerStatsRecord | null }) => {
      const buf = bufferRef.current;
      buf.systemStats = [...buf.systemStats, incoming.stats].slice(-MAX_BUFFER);
      if (incoming.containerStats) {
        buf.containerStats = [...buf.containerStats, incoming.containerStats].slice(-MAX_BUFFER);
      }
      setData({ ...buf });
    },
    [],
  );

  clientApi.widget.beszel.subscribeSystemStats.useSubscription(
    { integrationIds, systemId, includeDocker },
    { enabled: enabled && systemId !== "", onData },
  );

  return data;
};
