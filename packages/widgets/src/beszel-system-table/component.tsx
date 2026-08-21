"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, Center, Group, Loader, Progress, Text } from "@mantine/core";
import type { DataTableColumn, DataTableSortStatus } from "mantine-datatable";
import {
  Activity,
  Battery,
  Cpu,
  HardDrive,
  MemoryStick,
  Monitor,
  Network,
  Server,
  Thermometer,
  Wifi,
} from "lucide-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useOptionalBoard } from "@homarr/boards/context";
import { formatBytes } from "@homarr/common";
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { HomarrDataTable } from "../common/homarr-data-table";
import { getUsableWidgetQueryData } from "../common/query-state";
import { usePersistedTableLayout, useTableLayoutPersistence } from "../common/use-persisted-table-layout";
import type { BeszelSystemRow } from "../beszel/_shared/types";
import { loadAvgColor, statusColorMap, thresholdColor } from "../beszel/_shared/colors";
import {
  formatByteRate,
  formatLoadAvg,
  formatPercent,
  formatTemp,
  formatUptime,
  getProgressTrackSize,
} from "../beszel/_shared/format";
import { useBeszelFilteredSystems } from "../beszel/_shared/hooks";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import { BeszelSystemStatsModal } from "../beszel/_shared/system-stats-modal";
import { DiskUsage } from "../beszel/_shared/disk-usage";
import { getBeszelTableVisibleMetricKeys } from "./display";

const directionMultiplier: Record<string, number> = { asc: 1, desc: -1 };

type SystemRowWithKey = BeszelSystemRow & { rowKey: string; integrationName: string };

const columnAccessors = [
  "name",
  "integrationName",
  "hostname",
  "osName",
  "cpuModel",
  "cores",
  "memoryTotal",
  "cpu",
  "memory",
  "disk",
  "gpu",
  "loadAvg",
  "netBytes",
  "temp",
  "battery",
  "services",
  "uptime",
  "agentVersion",
] as const satisfies readonly (keyof SystemRowWithKey)[];

interface SizeConfig {
  iconSize: number;
  fontSize: "xs" | "sm";
  progressSize: "xs" | "sm";
  cellPadding: number;
  valueMiw: number;
}

const getSizeConfig = (width: number): SizeConfig => {
  if (width < 400) {
    return {
      iconSize: 10,
      fontSize: "xs",
      progressSize: "xs",
      cellPadding: 2,
      valueMiw: 30,
    };
  }
  return {
    iconSize: 14,
    fontSize: "sm",
    progressSize: "sm",
    cellPadding: 4,
    valueMiw: 38,
  };
};

const PercentCell = ({ value, size }: { value: number; size: SizeConfig }) => {
  return (
    <Group gap={8} wrap="nowrap" style={{ flex: 1 }}>
      <Text size={size.fontSize} fw={500} w={size.valueMiw} ta="left" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
        {formatPercent(value)}
      </Text>
      <Progress
        value={value}
        color={thresholdColor(value)}
        size={getProgressTrackSize(size.progressSize)}
        style={{ flex: 1 }}
      />
    </Group>
  );
};

export default function BeszelSystemTableWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  boardId,
  itemId,
  setOptions,
  displayMode,
}: WidgetComponentProps<"beszelSystemTable">) {
  const t = useI18n("widget.beszelSystemTable");
  const tBeszel = useI18n("widget.beszel");
  const tCommon = useI18n("common");
  const { openModal } = useModalAction(BeszelSystemStatsModal);
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const systemsQuery = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const systemsData = getUsableWidgetQueryData(systemsQuery);
  const results = useMemo(() => systemsData ?? [], [systemsData]);
  const { isPending } = systemsQuery;
  const isAdvanced = displayMode === "advanced";
  const size = useMemo(() => getSizeConfig(width), [width]);
  const visibleMetricKeys = useMemo(
    () => getBeszelTableVisibleMetricKeys(options, width, isAdvanced),
    [options, width, isAdvanced],
  );

  const { mutate: saveItemOptions } = clientApi.widget.options.saveItemOptions.useMutation({
    onError: () =>
      showErrorNotification({
        title: t("error.layoutSaveTitle"),
        message: t("error.layoutSaveMessage"),
      }),
  });
  const persistLayout = useTableLayoutPersistence({
    boardId,
    hasChangeAccess,
    itemId,
    saveItemOptions,
    setOptions,
  });

  const filteredSystems = useBeszelFilteredSystems(results, options.statusFilter);
  const integrationNames = useMemo(
    () => new Map(results.map((result) => [result.integrationId, result.integrationName])),
    [results],
  );
  const systemsWithSource = useMemo(
    () =>
      filteredSystems.map((system) => ({
        ...system,
        integrationName: integrationNames.get(system.rowKey.split(":")[0] ?? "") ?? "—",
      })),
    [filteredSystems, integrationNames],
  );

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<SystemRowWithKey>>({
    columnAccessor: options.sortBy,
    direction: options.sortDirection as "asc" | "desc",
  });
  useEffect(() => {
    setSortStatus({
      columnAccessor: options.sortBy,
      direction: options.sortDirection as "asc" | "desc",
    });
  }, [options.sortBy, options.sortDirection]);

  const sortedSystems = useMemo(() => {
    const accessor = sortStatus.columnAccessor as keyof SystemRowWithKey;
    const dir = directionMultiplier[sortStatus.direction] ?? 1;
    return [...systemsWithSource].toSorted((a, b) => {
      const aVal = a[accessor] ?? 0;
      const bVal = b[accessor] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") return aVal.localeCompare(bVal) * dir;
      if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * dir;
      return 0;
    });
  }, [systemsWithSource, sortStatus]);

  const columns = useMemo((): DataTableColumn<SystemRowWithKey>[] => {
    const cols: (DataTableColumn<SystemRowWithKey> | false)[] = [
      {
        accessor: "name",
        width: 160,
        ellipsis: true,
        title: (
          <Group gap={4} wrap="nowrap">
            <Server size={size.iconSize} />
            <Text inherit>{tBeszel("metric.system")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => (
          <Group gap={8} wrap="nowrap" style={{ overflow: "hidden", paddingInlineStart: 4 }}>
            <Box w={7} h={7} bg={statusColorMap[record.status]} style={{ borderRadius: "50%", flexShrink: 0 }} />
            <Text size={size.fontSize} fw={500} truncate>
              {record.name}
            </Text>
          </Group>
        ),
      },
      isAdvanced && {
        accessor: "integrationName",
        width: 140,
        ellipsis: true,
        title: tBeszel("metric.source"),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.integrationName}</Text>,
      },
      isAdvanced && {
        accessor: "hostname",
        width: 150,
        ellipsis: true,
        title: tBeszel("metric.hostname"),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.hostname || "—"}</Text>,
      },
      isAdvanced && {
        accessor: "osName",
        width: 160,
        ellipsis: true,
        title: invariantTechnicalLabels.os,
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.osName || "—"}</Text>,
      },
      isAdvanced && {
        accessor: "cpuModel",
        width: 220,
        ellipsis: true,
        title: tBeszel("metric.cpuModel"),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.cpuModel || "—"}</Text>,
      },
      isAdvanced && {
        accessor: "cores",
        width: 80,
        title: tBeszel("metric.cores"),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.cores}</Text>,
      },
      isAdvanced && {
        accessor: "memoryTotal",
        width: 120,
        title: tBeszel("metric.memoryTotal"),
        sortable: true,
        render: (record) => (
          <Text size={size.fontSize}>{record.memoryTotal > 0 ? formatBytes(record.memoryTotal) : "—"}</Text>
        ),
      },
      visibleMetricKeys.has("showCpu") && {
        accessor: "cpu",
        width: 140,
        title: (
          <Group gap={4} wrap="nowrap">
            <Cpu size={size.iconSize} />
            <Text inherit>{invariantTechnicalLabels.cpu}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.cpu} size={size} />,
      },
      visibleMetricKeys.has("showMemory") && {
        accessor: "memory",
        width: 140,
        title: (
          <Group gap={4} wrap="nowrap">
            <MemoryStick size={size.iconSize} />
            <Text inherit>{tBeszel("metric.memory")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.memory} size={size} />,
      },
      visibleMetricKeys.has("showDisk") && {
        accessor: "disk",
        width: 160,
        title: (
          <Group gap={4} wrap="nowrap">
            <HardDrive size={size.iconSize} />
            <Text inherit>{tBeszel("metric.disk")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => (
          <DiskUsage
            system={record}
            fontSize={size.fontSize}
            progressSize={size.progressSize}
            valueMiw={size.valueMiw}
            valueGap={8}
          />
        ),
      },
      visibleMetricKeys.has("showGpu") && {
        accessor: "gpu",
        width: 140,
        title: (
          <Group gap={4} wrap="nowrap">
            <Monitor size={size.iconSize} />
            <Text inherit>{invariantTechnicalLabels.gpu}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.gpu} size={size} />,
      },
      visibleMetricKeys.has("showLoadAvg") && {
        accessor: "loadAvg",
        width: 100,
        title: (
          <Group gap={4} wrap="nowrap">
            <Activity size={size.iconSize} />
            <Text inherit>{tBeszel("metric.loadAvg")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => (
          <Group gap={8} wrap="nowrap">
            <Box
              w={7}
              h={7}
              bg={record.loadAvg ? loadAvgColor(record.loadAvg[0], record.cores) : "gray"}
              style={{ borderRadius: "50%", flexShrink: 0 }}
            />
            <Text size={size.fontSize}>{formatLoadAvg(record.loadAvg)}</Text>
          </Group>
        ),
      },
      visibleMetricKeys.has("showNet") && {
        accessor: "netBytes",
        width: 100,
        title: (
          <Group gap={4} wrap="nowrap">
            <Network size={size.iconSize} />
            <Text inherit>{tBeszel("metric.net")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => (
          <Text size={size.fontSize} style={{ whiteSpace: "nowrap" }}>
            {formatByteRate(record.netBytes)}
          </Text>
        ),
      },
      visibleMetricKeys.has("showTemp") && {
        accessor: "temp",
        width: 80,
        title: (
          <Group gap={4} wrap="nowrap">
            <Thermometer size={size.iconSize} />
            <Text inherit>{tBeszel("metric.temp")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{formatTemp(record.temp, false)}</Text>,
      },
      visibleMetricKeys.has("showBattery") && {
        accessor: "battery",
        width: 70,
        title: (
          <Group gap={4} wrap="nowrap">
            <Battery size={size.iconSize} />
            <Text inherit>{tBeszel("metric.battery")}</Text>
          </Group>
        ),
        render: (record) => <Text size={size.fontSize}>{record.battery ? `${record.battery[0]}%` : "—"}</Text>,
      },
      visibleMetricKeys.has("showServices") && {
        accessor: "services",
        width: 80,
        title: (
          <Group gap={4} wrap="nowrap">
            <Server size={size.iconSize} />
            <Text inherit>{tCommon("services")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.services}</Text>,
      },
      visibleMetricKeys.has("showUptime") && {
        accessor: "uptime",
        width: 90,
        title: (
          <Group gap={4} wrap="nowrap">
            <Activity size={size.iconSize} />
            <Text inherit>{tBeszel("metric.uptime")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{formatUptime(record.uptime)}</Text>,
      },
      visibleMetricKeys.has("showAgent") && {
        accessor: "agentVersion",
        width: 90,
        title: (
          <Group gap={4} wrap="nowrap">
            <Wifi size={size.iconSize} />
            <Text inherit>{tBeszel("metric.agent")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.agentVersion}</Text>,
      },
    ];

    return cols.filter(Boolean) as DataTableColumn<SystemRowWithKey>[];
  }, [tBeszel, tCommon, size, visibleMetricKeys, isAdvanced]);

  const { effectiveColumns, storeKey } = usePersistedTableLayout({
    columns,
    columnAccessors,
    columnOrder: options.columnOrder,
    columnWidths: options.columnWidths,
    itemId,
    storeKeyPrefix: "beszel-system-table",
    onLayoutChange: persistLayout,
  });

  const handleRowClick = useCallback(
    ({ record }: { record: SystemRowWithKey }) => {
      const integrationId = record.rowKey.split(":")[0] ?? "";
      openModal({ integrationId, systemId: record.id }, { title: record.name });
    },
    [openModal],
  );

  if (isPending) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  const table = (
    <div style={{ position: "relative", height: "100%" }}>
      <div style={{ position: "absolute", top: 4, right: 8, zIndex: 1 }}>
        <Group gap={0}>
          <WidgetQueryErrorIndicator error={systemsQuery.error} label={t("name")} />
          <IntegrationErrorIndicator results={results} />
        </Group>
      </div>
      <HomarrDataTable
        isEditMode={isEditMode}
        cellPadding={`${size.cellPadding}px 8px`}
        fz={size.fontSize}
        records={sortedSystems}
        columns={effectiveColumns}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        noRecordsText={tBeszel("empty.noSystems")}
        idAccessor="rowKey"
        storeColumnsKey={storeKey}
        onRowClick={isEditMode ? undefined : handleRowClick}
      />
    </div>
  );

  return table;
}
