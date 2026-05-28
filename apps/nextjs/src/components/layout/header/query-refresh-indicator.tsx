"use client";

import { forwardRef, useEffect, useState } from "react";
import { Box, Indicator, Menu, ScrollArea, Text, UnstyledButton } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { useEditMode } from "@homarr/boards/edit-mode";

interface QueryStatusRow {
  id: string;
  section: string;
  procedure: string;
  status: "pending" | "error" | "success";
  fetchStatus: "fetching" | "paused" | "idle";
  dataUpdatedAt: number;
  isStale: boolean;
}

const trackedQueryPrefixes = new Set(["widget", "integration"]);

const isTrackedQuery = (queryKey: readonly unknown[]): boolean => {
  const first = queryKey[0];
  return Array.isArray(first) && first.length >= 1 && trackedQueryPrefixes.has(first[0] as string);
};

const sectionLabels: Record<string, string> = {
  widget: "Widgets",
  integration: "Integrations",
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const parseQueryKey = (queryKey: readonly unknown[]): { section: string; procedure: string } => {
  const first = queryKey[0];
  if (!Array.isArray(first)) return { section: "Other", procedure: String(first) };

  const parts = first.filter((s): s is string => typeof s === "string");
  const sectionKey = parts[0] ?? "other";
  const section = sectionLabels[sectionKey] ?? capitalize(sectionKey);

  const remaining = parts.slice(1);
  const procedure = remaining.length > 0 ? remaining.map(capitalize).join(" — ") : sectionKey;

  return { section, procedure };
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
      const queries = cache.findAll({ type: "active" }).filter((q) => isTrackedQuery(q.queryKey));

      let fetching = 0;
      let errors = 0;
      let stale = 0;
      const nextRows: QueryStatusRow[] = queries.map((q) => {
        if (q.state.fetchStatus === "fetching") fetching++;
        if (q.state.status === "error") errors++;
        const isQueryStale = q.isStale();
        if (isQueryStale) stale++;
        const { section, procedure } = parseQueryKey(q.queryKey);
        return {
          id: q.queryHash,
          section,
          procedure,
          status: q.state.status,
          fetchStatus: q.state.fetchStatus,
          dataUpdatedAt: q.state.dataUpdatedAt,
          isStale: isQueryStale,
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

function groupBySection(rows: QueryStatusRow[]): Map<string, QueryStatusRow[]> {
  const groups = new Map<string, QueryStatusRow[]>();
  for (const row of rows) {
    const existing = groups.get(row.section);
    if (existing) {
      existing.push(row);
    } else {
      groups.set(row.section, [row]);
    }
  }
  return groups;
}

const StatusDot = forwardRef<HTMLButtonElement, { color: string; processing: boolean }>(
  ({ color, processing, ...others }, ref) => (
    <UnstyledButton ref={ref} {...others} style={{ lineHeight: 0 }}>
      <Indicator color={color} size={10} processing={processing} withBorder>
        <Box w={0} h={0} />
      </Indicator>
    </UnstyledButton>
  ),
);

export const QueryRefreshIndicator = () => {
  const [isEditMode] = useEditMode();
  const { rows, widgetFetchingCount, errorCount, totalCount } = useQueryCacheStatus();

  if (isEditMode || totalCount === 0) return null;

  const isFetching = widgetFetchingCount > 0;
  const color = isFetching ? "orange" : errorCount > 0 ? "red" : "green";
  const grouped = groupBySection(rows);

  return (
    <Menu width={320} position="bottom-start" shadow="md" withArrow>
      <Menu.Target>
        <StatusDot color={color} processing={isFetching} />
      </Menu.Target>
      <Menu.Dropdown>
        <ScrollArea.Autosize mah={360}>
          {Array.from(grouped).map(([section, sectionRows], i) => (
            <div key={section}>
              {i > 0 && <Menu.Divider />}
              <Menu.Label>{section}</Menu.Label>
              {sectionRows.map((row) => (
                <QueryMenuItem key={row.id} row={row} />
              ))}
            </div>
          ))}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
};

const QueryMenuItem = ({ row }: { row: QueryStatusRow }) => {
  const rowColor = statusColorMap[row.fetchStatus === "fetching" ? "fetching" : `idle_${row.status}`] ?? "gray";

  const updatedLabel = row.dataUpdatedAt > 0 ? dayjs(row.dataUpdatedAt).fromNow() : "never";

  return (
    <Menu.Item
      leftSection={
        <Box
          w={8}
          h={8}
          style={{ borderRadius: "50%", flexShrink: 0, backgroundColor: `var(--mantine-color-${rowColor}-6)` }}
        />
      }
      rightSection={
        <Text size="xs" c="dimmed">
          {updatedLabel}
        </Text>
      }
      style={{ cursor: "default" }}
    >
      <Text size="xs" lineClamp={1}>
        {row.procedure}
      </Text>
    </Menu.Item>
  );
};
