"use client";

import { useMemo, useState } from "react";
import { Anchor, Badge, Box, Center, Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconBrandAndroid,
  IconBrandApple,
  IconBrandDebian,
  IconBrandRedhat,
  IconBrandUbuntu,
  IconBrandWindows,
  IconDevicesPc,
  IconServer,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import type { DataTableColumn, DataTableSortStatus } from "mantine-datatable";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import type { WazuhAgent } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { WidgetEmptyState } from "../../common/empty-state";
import { HomarrDataTable } from "../../common/homarr-data-table";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { usePersistedTableLayout, useTableLayoutPersistence } from "../../common/use-persisted-table-layout";
import { useWidgetNow } from "../../common/use-widget-now";
import type { WazuhViewProps } from "../view-props";
import { WazuhChip } from "../_shared/badges";
import { WazuhErrorState } from "../_shared/error-state";
import { WazuhRelativeTime, WazuhPendingState, WazuhStatTile, WazuhWidgetFrame } from "../_shared/frame";
import { useWazuhLinks } from "../_shared/use-wazuh-links";
import classes from "../_shared/wazuh.module.css";

type SortKey = "status" | "name" | "ip" | "os" | "version" | "lastKeepAlive";
type StatusFilter = "all" | "active" | "disconnected" | "inactive";

const statusOrder: Record<WazuhAgent["status"], number> = {
  disconnected: 0,
  pending: 1,
  never_connected: 2,
  unknown: 3,
  active: 4,
};

const getOsIcon = (platform: string | null, name: string | null): TablerIcon => {
  const value = `${platform ?? ""} ${name ?? ""}`.toLowerCase();
  if (value.includes("windows")) return IconBrandWindows;
  if (value.includes("ubuntu")) return IconBrandUbuntu;
  if (value.includes("debian")) return IconBrandDebian;
  if (value.includes("darwin") || value.includes("mac")) return IconBrandApple;
  if (value.includes("android")) return IconBrandAndroid;
  if (/(rhel|red ?hat|centos|rocky|alma|fedora|amzn|oracle)/.test(value)) return IconBrandRedhat;
  return IconServer;
};

// Keep the OS cell readable in narrow columns: "Microsoft Windows 11 Pro" -> "Windows 11 Pro", "Debian GNU/Linux" -> "Debian".
const shortOsName = (name: string | null) =>
  name
    ?.replace(/^Microsoft\s+/i, "")
    .replace(/\s*GNU\/Linux/i, "")
    .replace(/\s*\(.*\)\s*$/, "")
    .trim() ?? null;

const parseVersion = (value: string | null) =>
  (value ?? "")
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);

const compareVersions = (left: string | null, right: string | null) => {
  const [a, b] = [parseVersion(left), parseVersion(right)];
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const ipToNumber = (ip: string | null) =>
  (ip ?? "").split(".").reduce((total, part) => total * 256 + (Number.parseInt(part, 10) || 0), 0);

const compareIps = (left: string | null, right: string | null) => ipToNumber(left) - ipToNumber(right);

const sorters: Record<SortKey, (left: WazuhAgent, right: WazuhAgent) => number> = {
  status: (left, right) => statusOrder[left.status] - statusOrder[right.status] || left.name.localeCompare(right.name),
  name: (left, right) => left.name.localeCompare(right.name),
  ip: (left, right) => compareIps(left.ip, right.ip),
  os: (left, right) => (left.osName ?? "~").localeCompare(right.osName ?? "~") || left.name.localeCompare(right.name),
  version: (left, right) => compareVersions(left.version, right.version) || left.name.localeCompare(right.name),
  // Most recent first by default.
  lastKeepAlive: (left, right) => (right.lastKeepAlive ?? "").localeCompare(left.lastKeepAlive ?? ""),
};

const agentColumnAccessors = ["status", "name", "ip", "os", "version", "lastKeepAlive", "groups"] as const;

const snapshotColor = (ageMs: number) => {
  if (ageMs < 20 * 60_000) return "green";
  if (ageMs < 2 * 60 * 60_000) return "yellow";
  return "red";
};

export function WazuhAgentsView({
  integrationIds,
  options,
  width,
  height,
  isEditMode,
  boardId,
  itemId,
  setOptions,
}: WazuhViewProps) {
  const t = useI18n("widget.wazuh.agents");
  const locale = useCurrentIntlLocale();
  const now = useWidgetNow("minute");
  const integrationId = integrationIds[0] ?? "";
  const query = clientApi.widget.wazuh.getAgents.useQuery(
    { integrationId },
    { staleTime: 60_000, refetchInterval: 60_000 },
  );
  const result = getUsableWidgetQueryData(query);
  const links = useWazuhLinks(result?.dashboardUrl);

  const [filter, setFilter] = useState<StatusFilter>(options.agentStatusFilter);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<WazuhAgent>>({
    columnAccessor: options.agentSortBy,
    direction: "asc",
  });

  const agents = result?.data?.agents;
  const newestVersion = useMemo(
    () =>
      (agents ?? []).reduce<string | null>(
        (newest, agent) => (compareVersions(agent.version, newest) > 0 ? agent.version : newest),
        null,
      ),
    [agents],
  );
  const visibleAgents = useMemo(() => {
    const filtered = (agents ?? []).filter((agent) => {
      if (filter === "all") return true;
      if (filter === "inactive") return agent.status !== "active";
      return agent.status === filter;
    });
    const sorter = sorters[sortStatus.columnAccessor as SortKey] ?? sorters.status;
    const sorted = filtered.toSorted(sorter);
    return sortStatus.direction === "desc" ? sorted.toReversed() : sorted;
  }, [agents, filter, sortStatus]);

  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation({
    scope: { id: `wazuh-agents-layout:${boardId ?? "preview"}:${itemId ?? "preview"}` },
  });
  const persistLayout = useTableLayoutPersistence({
    boardId,
    hasChangeAccess,
    itemId,
    saveItemOptions,
    setOptions,
  });

  const showIp = width >= 380;
  const showOs = width >= 460;
  const showVersion = options.showVersion && width >= 600;
  const showGroups = options.showGroups && width >= 720;
  const columns = useMemo<DataTableColumn<WazuhAgent>[]>(() => {
    const all: (DataTableColumn<WazuhAgent> & { visible: boolean })[] = [
      {
        accessor: "status",
        title: "",
        width: 26,
        sortable: true,
        visible: true,
        render: (agent) => (
          <Tooltip label={t(`statusLabel.${agent.status}`)} withArrow openDelay={200}>
            <span
              className={classes.statusDot}
              data-status={agent.status}
              aria-label={t(`statusLabel.${agent.status}`)}
            />
          </Tooltip>
        ),
      },
      {
        accessor: "name",
        title: t("column.name"),
        width: 170,
        sortable: true,
        ellipsis: true,
        visible: true,
        render: (agent) => (
          <Group gap={6} wrap="nowrap" title={`${agent.name} (${agent.id})`} style={{ overflow: "hidden" }}>
            {links ? (
              <Anchor
                href={links.agent(agent.id)}
                target="_blank"
                rel="noopener noreferrer"
                size="xs"
                c="inherit"
                fw={500}
                truncate
              >
                {agent.name}
              </Anchor>
            ) : (
              <Text size="xs" fw={500} truncate>
                {agent.name}
              </Text>
            )}
            {width >= 520 && (
              <Text span size="10px" c="dimmed" className={classes.mono}>
                {agent.id}
              </Text>
            )}
          </Group>
        ),
      },
      {
        accessor: "ip",
        title: t("column.ip"),
        width: 110,
        sortable: true,
        ellipsis: true,
        visible: showIp,
        cellsClassName: classes.mono,
        render: (agent) => agent.ip ?? "-",
      },
      {
        accessor: "os",
        title: t("column.os"),
        width: 160,
        sortable: true,
        visible: showOs,
        render: (agent) => {
          const OsIcon = getOsIcon(agent.osPlatform, agent.osName);
          return (
            <Group gap={5} wrap="nowrap" title={[agent.osName, agent.osVersion].filter(Boolean).join(" ")}>
              <OsIcon size={14} stroke={1.6} style={{ flexShrink: 0, opacity: 0.85 }} />
              <Text size="xs" truncate>
                {shortOsName(agent.osName) ?? "-"}
                {width >= 800 && agent.osVersion ? (
                  <Text span size="xs" c="dimmed">
                    {" "}
                    {agent.osVersion}
                  </Text>
                ) : null}
              </Text>
            </Group>
          );
        },
      },
      {
        accessor: "version",
        title: t("column.version"),
        width: 80,
        sortable: true,
        visible: showVersion,
        render: (agent) => {
          const outdated =
            agent.version !== null && newestVersion !== null && compareVersions(agent.version, newestVersion) < 0;
          return (
            <Tooltip
              label={outdated ? t("outdated", { version: newestVersion ?? "" }) : (agent.version ?? "-")}
              withArrow
              disabled={!agent.version}
            >
              <Text size="xs" c={outdated ? "yellow.5" : undefined} className={classes.mono}>
                {agent.version ?? "-"}
              </Text>
            </Tooltip>
          );
        },
      },
      {
        accessor: "lastKeepAlive",
        title: t("column.lastKeepAlive"),
        width: 90,
        sortable: true,
        visible: true,
        render: (agent) => <WazuhRelativeTime value={agent.lastKeepAlive} short />,
      },
      {
        accessor: "groups",
        title: t("column.groups"),
        width: 110,
        visible: showGroups,
        render: (agent) => (
          <Group gap={3} wrap="nowrap" style={{ overflow: "hidden" }}>
            {agent.groups.slice(0, 2).map((group) => (
              <WazuhChip key={group}>{group}</WazuhChip>
            ))}
            {agent.groups.length > 2 && <WazuhChip>{`+${agent.groups.length - 2}`}</WazuhChip>}
          </Group>
        ),
      },
    ];
    return all.filter(({ visible }) => visible).map(({ visible: _visible, ...column }) => column);
  }, [links, newestVersion, showGroups, showIp, showOs, showVersion, t, width]);
  const { effectiveColumns, storeKey } = usePersistedTableLayout({
    columns,
    columnAccessors: agentColumnAccessors,
    columnOrder: options.columnOrder,
    columnWidths: options.columnWidths,
    itemId,
    storeKeyPrefix: "wazuh-agents",
    onLayoutChange: persistLayout,
  });

  const compact = height < 170 || width < 260;

  if (isInitialWidgetQueryPending(query)) {
    return (
      <WazuhWidgetFrame icon={IconDevicesPc} title={t("title")} compact={compact} iconColor="teal">
        <WazuhPendingState />
      </WazuhWidgetFrame>
    );
  }
  if (!result) return <WidgetEmptyState />;
  if (result.error) return <WazuhErrorState error={result.error} compact={height < 160} />;

  const overview = result.data;
  const counts = overview.counts;
  const snapshotAgeMs = (now ?? new Date()).getTime() - new Date(overview.asOf).getTime();
  const showTable = height >= 190;
  const toggleFilter = (value: StatusFilter) => setFilter((current) => (current === value ? "all" : value));

  const sourceBadge =
    overview.source === "api" ? (
      <Badge size="sm" variant="dot" color="green" radius="sm">
        {t("live")}
      </Badge>
    ) : (
      <Tooltip
        label={
          snapshotAgeMs > 2 * 60 * 60_000
            ? t("staleSnapshot", { time: new Date(overview.asOf).toLocaleString(locale) })
            : t("snapshotHint", { time: new Date(overview.asOf).toLocaleString(locale) })
        }
        withArrow
        multiline
        w={260}
      >
        <Badge size="sm" variant="dot" color={snapshotColor(snapshotAgeMs)} radius="sm">
          {width >= 300
            ? t("snapshot", { age: dayjs(overview.asOf).fromNow(true) })
            : dayjs(overview.asOf).fromNow(true)}
        </Badge>
      </Tooltip>
    );

  return (
    <WazuhWidgetFrame
      icon={IconDevicesPc}
      title={t("total", { count: String(counts.total) })}
      href={links?.agents}
      compact={compact}
      iconColor="teal"
      headerRight={sourceBadge}
    >
      <Stack h="100%" gap={8}>
        <Group gap={6} wrap="nowrap" grow>
          <WazuhStatTile
            label={t("status.active")}
            value={String(counts.active)}
            color="green"
            active={filter === "active"}
            onClick={() => toggleFilter("active")}
            compact={compact}
          />
          <WazuhStatTile
            label={t("status.disconnected")}
            value={String(counts.disconnected)}
            color="red"
            active={filter === "disconnected"}
            onClick={() => toggleFilter("disconnected")}
            compact={compact}
          />
          {width >= 300 && (
            <WazuhStatTile
              label={t("status.neverConnected")}
              value={String(counts.neverConnected)}
              color="gray"
              active={filter === "inactive"}
              onClick={() => toggleFilter("inactive")}
              compact={compact}
            />
          )}
          {width >= 380 && (
            <WazuhStatTile
              label={t("status.pending")}
              value={String(counts.pending)}
              color="yellow"
              compact={compact}
            />
          )}
        </Group>

        {showTable &&
          (visibleAgents.length === 0 ? (
            <Center style={{ flex: 1 }}>
              <Text size="sm" c="dimmed">
                {filter === "disconnected" ? t("noDisconnected") : t("empty")}
              </Text>
            </Center>
          ) : (
            <Box style={{ flex: 1, minHeight: 0 }}>
              <HomarrDataTable
                isEditMode={isEditMode}
                cellPadding="2px 6px"
                rowCursor="default"
                fz="xs"
                records={visibleAgents}
                columns={effectiveColumns}
                storeColumnsKey={storeKey}
                sortStatus={sortStatus}
                onSortStatusChange={isEditMode ? undefined : setSortStatus}
                idAccessor="id"
              />
            </Box>
          ))}
      </Stack>
    </WazuhWidgetFrame>
  );
}
