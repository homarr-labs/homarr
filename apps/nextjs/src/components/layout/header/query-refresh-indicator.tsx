"use client";

import { forwardRef, useEffect, useState } from "react";
import { Avatar, Box, Group, Indicator, Menu, ScrollArea, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import { useEditMode } from "@homarr/boards/edit-mode";
import type { IntegrationKind } from "@homarr/definitions";
import { getIconUrl } from "@homarr/definitions";

interface IntegrationInfo {
  id: string;
  kind: IntegrationKind;
  name: string;
}

interface QueryStatusRow {
  id: string;
  procedure: string;
  integrationIcons: { kind: IntegrationKind; name: string }[];
  status: "pending" | "error" | "success";
  fetchStatus: "fetching" | "paused" | "idle";
  dataUpdatedAt: number;
}

const hiddenProcedures = new Set(["widget.app.ping"]);

const isTrackedWidgetQuery = (queryKey: readonly unknown[]): boolean => {
  const first = queryKey[0];
  if (!Array.isArray(first) || first.length < 2 || first[0] !== "widget") return false;

  const path = first.join(".");
  return !hiddenProcedures.has(path);
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const parseWidgetQueryKey = (queryKey: readonly unknown[]): { procedure: string; integrationIds: string[] } => {
  const first = queryKey[0] as string[];
  const procedure = first.slice(1).map(capitalize).join(" — ");

  const second = queryKey[1] as { input?: Record<string, unknown> } | undefined;
  const integrationIds = Array.isArray(second?.input?.integrationIds)
    ? (second.input.integrationIds as string[])
    : [];

  return { procedure, integrationIds };
};

const statusColors: Record<string, string> = {
  fetching: "orange",
  success: "green",
  error: "red",
  pending: "gray",
};

const resolveRowColor = (fetchStatus: string, status: string) => {
  if (fetchStatus === "fetching") return statusColors.fetching!;
  return statusColors[status] ?? "gray";
};

const resolveDotColor = (fetchingCount: number, errorCount: number) => {
  if (fetchingCount > 0) return statusColors.fetching!;
  if (errorCount > 0) return statusColors.error!;
  return statusColors.success!;
};

interface CacheSnapshot {
  rows: QueryStatusRow[];
  fetchingCount: number;
  errorCount: number;
}

const emptyCacheSnapshot: CacheSnapshot = { rows: [], fetchingCount: 0, errorCount: 0 };

function resolveIntegrationMap(queryClient: ReturnType<typeof useQueryClient>): Map<string, IntegrationInfo> {
  const cache = queryClient.getQueryCache();
  const integrationQuery = cache.find({ queryKey: [["integration", "all"]] });

  const map = new Map<string, IntegrationInfo>();
  const data = integrationQuery?.state.data as IntegrationInfo[] | undefined;
  if (!data) return map;

  for (const integration of data) {
    map.set(integration.id, integration);
  }
  return map;
}

function useQueryCacheStatus() {
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState<CacheSnapshot>(emptyCacheSnapshot);

  useEffect(() => {
    const update = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.findAll({ type: "active" }).filter((q) => isTrackedWidgetQuery(q.queryKey));
      const integrationMap = resolveIntegrationMap(queryClient);

      let fetching = 0;
      let errors = 0;
      const nextRows: QueryStatusRow[] = queries.map((q) => {
        if (q.state.fetchStatus === "fetching") fetching++;
        if (q.state.status === "error") errors++;
        const { procedure, integrationIds } = parseWidgetQueryKey(q.queryKey);

        const integrationIcons = integrationIds
          .map((id) => integrationMap.get(id))
          .filter((info): info is IntegrationInfo => info !== undefined)
          .map(({ kind, name }) => ({ kind, name }));

        return {
          id: q.queryHash,
          procedure,
          integrationIcons,
          status: q.state.status,
          fetchStatus: q.state.fetchStatus,
          dataUpdatedAt: q.state.dataUpdatedAt,
        };
      });

      setSnapshot({ rows: nextRows, fetchingCount: fetching, errorCount: errors });
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
  const { rows, fetchingCount, errorCount, totalCount } = useQueryCacheStatus();

  if (isEditMode || totalCount === 0) return null;

  const isFetching = fetchingCount > 0;
  const dotColor = resolveDotColor(fetchingCount, errorCount);

  return (
    <Menu width={340} position="bottom-start" shadow="md" withArrow>
      <Menu.Target>
        <StatusDot color={dotColor} processing={isFetching} />
      </Menu.Target>
      <Menu.Dropdown>
        <ScrollArea.Autosize mah={360}>
          {rows.map((row) => (
            <QueryMenuItem key={row.id} row={row} />
          ))}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
};

const SmallDot = ({ color }: { color: string }) => (
  <Box
    w={8}
    h={8}
    miw={8}
    style={{ borderRadius: "50%", flexShrink: 0, backgroundColor: `var(--mantine-color-${color}-6)` }}
  />
);

const QueryMenuItem = ({ row }: { row: QueryStatusRow }) => {
  const rowColor = resolveRowColor(row.fetchStatus, row.status);
  const updatedLabel = row.dataUpdatedAt > 0 ? dayjs(row.dataUpdatedAt).fromNow() : "—";

  return (
    <Menu.Item
      leftSection={
        <Group gap={6} wrap="nowrap">
          <SmallDot color={rowColor} />
          {row.integrationIcons.length > 0 && <IntegrationAvatars icons={row.integrationIcons} />}
        </Group>
      }
      rightSection={
        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
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

const IntegrationAvatars = ({ icons }: { icons: QueryStatusRow["integrationIcons"] }) => (
  <Group gap={2} wrap="nowrap">
    {icons.slice(0, 3).map((icon, index) => (
      <Tooltip key={`${icon.kind}-${index}`} label={icon.name} withArrow>
        <Avatar size={18} radius={0} src={getIconUrl(icon.kind)} />
      </Tooltip>
    ))}
  </Group>
);
