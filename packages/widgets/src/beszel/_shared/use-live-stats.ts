"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

// 120 records at ~1 per second = 2 minutes of rolling data for charts
const MAX_BUFFER = 120;

export const useLiveStats = (integrationIds: string[], systemId: string, enabled: boolean) => {
  const [systemStats, setSystemStats] = useState<BeszelSystemStatsRecord[]>([]);
  const [containerStats, setContainerStats] = useState<BeszelContainerStatsRecord[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Append to buffer, trimming to MAX_BUFFER
  const appendSystemStats = useCallback((record: BeszelSystemStatsRecord) => {
    setSystemStats((prev) => {
      const next = [...prev, record];
      return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
    });
  }, []);

  const appendContainerStats = useCallback((record: BeszelContainerStatsRecord) => {
    setContainerStats((prev) => {
      const next = [...prev, record];
      return next.length > MAX_BUFFER ? next.slice(-MAX_BUFFER) : next;
    });
  }, []);

  clientApi.widget.beszel.subscribeSystemStats.useSubscription(
    { integrationIds, systemId },
    {
      enabled: enabled && systemId !== "",
      onData(event) {
        setError(null);
        if (event.type === "system_stats") {
          appendSystemStats(event.record);
        } else {
          appendContainerStats(event.record);
        }
      },
      onError(err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      },
    },
  );

  // Reset buffers when system changes or integration changes
  const prevKeyRef = useRef<string>("");
  const currentKey = `${integrationIds.join(",")}:${systemId}`;
  useEffect(() => {
    if (prevKeyRef.current !== currentKey) {
      prevKeyRef.current = currentKey;
      setSystemStats([]);
      setContainerStats([]);
      setError(null);
    }
  }, [currentKey]);

  const data = systemStats.length > 0 || containerStats.length > 0 ? { systemStats, containerStats } : null;

  return { data, error };
};
