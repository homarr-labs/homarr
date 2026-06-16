"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";
import type { BeszelContainerStatsRecord, BeszelSystemStatsRecord } from "@homarr/integrations/types";

const MAX_BUFFER = 30;
const FLUSH_INTERVAL_MS = 3000;

interface LiveStatsData {
  systemStats: BeszelSystemStatsRecord[];
  containerStats: BeszelContainerStatsRecord[];
}

function appendToBuffer(
  prev: LiveStatsData | null,
  incoming: { stats: BeszelSystemStatsRecord; containerStats: BeszelContainerStatsRecord | null },
): LiveStatsData {
  const systemStats = [...(prev?.systemStats ?? []), incoming.stats].slice(-MAX_BUFFER);
  const prevContainer = prev?.containerStats ?? [];
  if (!incoming.containerStats) {
    return { systemStats, containerStats: prevContainer };
  }
  return { systemStats, containerStats: [...prevContainer, incoming.containerStats].slice(-MAX_BUFFER) };
}

export const useLiveStats = (integrationIds: string[], systemId: string, enabled: boolean) => {
  const [data, setData] = useState<LiveStatsData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const bufferRef = useRef<LiveStatsData | null>(null);
  const dirtyRef = useRef(false);
  const generationRef = useRef(0);

  const integrationKey = [...integrationIds].sort().join(",");

  useEffect(() => {
    generationRef.current += 1;
    setData(null);
    setError(null);
    bufferRef.current = null;
    dirtyRef.current = false;
  }, [systemId, enabled, integrationKey]);

  const onData = useCallback(
    (incoming: { stats: BeszelSystemStatsRecord; containerStats: BeszelContainerStatsRecord | null }) => {
      const gen = generationRef.current;
      queueMicrotask(() => {
        if (generationRef.current !== gen) return;
        setError(null);
        const isFirst = !bufferRef.current;
        bufferRef.current = appendToBuffer(bufferRef.current, incoming);
        dirtyRef.current = true;
        if (isFirst) {
          setData(bufferRef.current);
        }
      });
    },
    [],
  );

  const onError = useCallback((err: unknown) => {
    if (err instanceof Error) {
      setError(err);
      return;
    }
    setError(new Error(String(err)));
  }, []);

  const subscriptionInput = useMemo(() => ({ integrationIds, systemId }), [integrationKey, systemId]);
  const subscriptionEnabled = enabled && systemId !== "";

  useEffect(() => {
    if (!subscriptionEnabled) return;
    const gen = generationRef.current;
    const id = setInterval(() => {
      if (generationRef.current !== gen) return;
      if (!dirtyRef.current || !bufferRef.current) return;
      dirtyRef.current = false;
      setData(bufferRef.current);
    }, FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [subscriptionEnabled, integrationKey, systemId]);

  clientApi.widget.beszel.subscribeSystemStats.useSubscription(subscriptionInput, {
    enabled: subscriptionEnabled,
    onData,
    onError,
  });

  return { data, error };
};
