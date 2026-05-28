"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Group, HoverCard, Indicator, ScrollArea, Stack, Text } from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { HeaderButton } from "./button";

interface QueryStatusRow {
  id: string;
  label: string;
  status: "pending" | "error" | "success";
  fetchStatus: "fetching" | "paused" | "idle";
  dataUpdatedAt: number;
  isStale: boolean;
}

const widgetQueryPrefixes = new Set(["widget", "docker", "app", "integration"]);

const isWidgetQuery = (queryKey: readonly unknown[]): boolean => {
  const first = queryKey[0];
  return Array.isArray(first) && first.length >= 1 && widgetQueryPrefixes.has(first[0]);
};

const extractQueryLabel = (queryKey: readonly unknown[]): string => {
  const first = queryKey[0];
  if (Array.isArray(first)) {
    return first.filter((s) => typeof s === "string").join(".");
  }
  return String(first);
};

const statusColorMap: Record<string, string> = {
  fetching: "orange",
  idle_success: "green",
  idle_error: "red",
  idle_pending: "gray",
};

interface CacheSnapshot {
  rows: QueryStatusRow[];
  widgetFetchingCount: number;
  errorCount: number;
  staleCount: number;
}

const emptyCacheSnapshot: CacheSnapshot = { rows: [], widgetFetchingCount: 0, errorCount: 0, staleCount: 0 };

function useQueryCacheStatus() {
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState<CacheSnapshot>(emptyCacheSnapshot);

  useEffect(() => {
    const update = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.findAll({ type: "active" }).filter((q) => isWidgetQuery(q.queryKey));

      let fetching = 0;
      let errors = 0;
      let stale = 0;
      const nextRows: QueryStatusRow[] = queries.map((q) => {
        if (q.state.fetchStatus === "fetching") fetching++;
        if (q.state.status === "error") errors++;
        const isStale = q.isStale();
        if (isStale) stale++;
        return {
          id: q.queryHash,
          label: extractQueryLabel(q.queryKey),
          status: q.state.status,
          fetchStatus: q.state.fetchStatus,
          dataUpdatedAt: q.state.dataUpdatedAt,
          isStale,
        };
      });

      setSnapshot({ rows: nextRows, widgetFetchingCount: fetching, errorCount: errors, staleCount: stale });
    };

    update();

    let rafId: number | null = null;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    });

    return () => {
      unsubscribe();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [queryClient]);

  return { ...snapshot, totalCount: snapshot.rows.length };
}

const audioCtxRef = { current: null as AudioContext | null };

function useCompletionBeep(fetchingCount: number) {
  const prevRef = useRef(fetchingCount);

  useEffect(() => {
    const wasFetching = prevRef.current > 0;
    const nowIdle = fetchingCount === 0;
    prevRef.current = fetchingCount;

    if (!wasFetching || !nowIdle) return;

    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // audio blocked before user interaction
    }
  }, [fetchingCount]);
}

function useGreenFlash(fetchingCount: number) {
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(fetchingCount);

  useEffect(() => {
    const wasFetching = prevRef.current > 0;
    const nowIdle = fetchingCount === 0;
    prevRef.current = fetchingCount;

    if (!wasFetching || !nowIdle) return;

    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1500);
    return () => clearTimeout(timer);
  }, [fetchingCount]);

  return flash;
}

export const QueryRefreshIndicator = () => {
  const { rows, widgetFetchingCount, errorCount, staleCount, totalCount } = useQueryCacheStatus();
  const showGreen = useGreenFlash(widgetFetchingCount);
  useCompletionBeep(widgetFetchingCount);

  if (totalCount === 0) return null;

  const isFetching = widgetFetchingCount > 0;
  const color = isFetching ? "orange" : showGreen ? "green" : errorCount > 0 ? "red" : "green";

  return (
    <HoverCard width={360} position="bottom-end" shadow="md" withArrow>
      <HoverCard.Target>
        <Indicator color={color} size={8} processing={isFetching} withBorder>
          <HeaderButton>
            <IconDatabase stroke={1.5} size={20} />
          </HeaderButton>
        </Indicator>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Stack gap="xs">
          <Group justify="apart">
            <Text size="sm" fw={600}>
              Integration status
            </Text>
            <Text size="xs" c="dimmed">
              {totalCount} queries &middot; {widgetFetchingCount} fetching, {staleCount} stale, {errorCount} errors
            </Text>
          </Group>

          <ScrollArea.Autosize mah={240}>
            <Stack gap={4}>
              {rows.map((row) => (
                <QueryRow key={row.id} row={row} />
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};

const QueryRow = ({ row }: { row: QueryStatusRow }) => {
  const rowColor = statusColorMap[row.fetchStatus === "fetching" ? "fetching" : `idle_${row.status}`] ?? "gray";

  const updatedLabel = row.dataUpdatedAt > 0 ? dayjs(row.dataUpdatedAt).fromNow() : "never";

  return (
    <Group gap="xs" wrap="nowrap">
      <Box
        w={8}
        h={8}
        style={{ borderRadius: "50%", flexShrink: 0, backgroundColor: `var(--mantine-color-${rowColor}-6)` }}
      />
      <Text size="xs" lineClamp={1} style={{ flex: 1 }}>
        {row.label}
      </Text>
      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
        {updatedLabel}
      </Text>
    </Group>
  );
};
