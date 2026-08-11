"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Center, Group, Indicator, Loader, Progress, Text } from "@mantine/core";
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
import { useModalAction } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { HomarrDataTable } from "../common/homarr-data-table";
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
import { BeszelIntegrationErrorIndicator } from "../beszel/_shared/error-indicator";
import { BeszelSystemStatsModal } from "../beszel/_shared/system-stats-modal";
import { DiskUsage } from "../beszel/_shared/disk-usage";

/**
 * One cpu/memory/gpu cell.
 *
 * This lived inside the widget body, which made it a **new component type on every render**: React
 * cannot match a new type to the previous one, so it unmounted and remounted every cell's subtree
 * (Group, Text and Progress) instead of updating it. This widget re-renders about once a second from
 * its live Beszel subscription, so that was three cells per system torn down and rebuilt every
 * second. Declaring it here makes the type stable, and memo keeps a cell from re-rendering when its
 * own value has not changed.
 *
 * `size` is passed rather than closed over — it was the only thing the nested version captured.
 */
const PercentCell = memo(function PercentCell({ value, size }: { value: number; size: SizeConfig }) {
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
});

const directionMultiplier: Record<string, number> = { asc: 1, desc: -1 };

type SystemRowWithKey = BeszelSystemRow & { _key: string };

const columnAccessors = [
  "name",
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
] as const satisfies readonly (keyof BeszelSystemRow)[];

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

export default function BeszelSystemTableWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  boardId,
  itemId,
  setOptions,
}: WidgetComponentProps<"beszelSystemTable">) {
  const t = useScopedI18n("widget.beszelSystemTable");
  const { openModal } = useModalAction(BeszelSystemStatsModal);
  const board = useOptionalBoard();
  const { data: session } = useSession();
  const hasChangeAccess = board ? constructBoardPermissions(board, session).hasChangeAccess : false;
  const {
    data: results = [],
    error: systemsError,
    isPending,
  } = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const size = useMemo(() => getSizeConfig(width), [width]);

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
    const accessor = sortStatus.columnAccessor as keyof BeszelSystemRow;
    const dir = directionMultiplier[sortStatus.direction] ?? 1;
    return [...filteredSystems].toSorted((a, b) => {
      const aVal = a[accessor] ?? 0;
      const bVal = b[accessor] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") return aVal.localeCompare(bVal) * dir;
      if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * dir;
      return 0;
    });
  }, [filteredSystems, sortStatus]);

  const columns = useMemo((): DataTableColumn<SystemRowWithKey>[] => {
    const cols: (DataTableColumn<SystemRowWithKey> | false)[] = [
      {
        accessor: "name",
        width: 160,
        ellipsis: true,
        title: (
          <Group gap={4} wrap="nowrap">
            <Server size={size.iconSize} />
            <Text inherit>{t("column.system")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => (
          <Group gap={8} wrap="nowrap" style={{ overflow: "hidden", paddingInlineStart: 4 }}>
            <Indicator color={statusColorMap[record.status]} size={7} />
            <Text size={size.fontSize} fw={500} truncate>
              {record.name}
            </Text>
          </Group>
        ),
      },
      options.showCpu && {
        accessor: "cpu",
        width: 140,
        title: (
          <Group gap={4} wrap="nowrap">
            <Cpu size={size.iconSize} />
            <Text inherit>{t("column.cpu")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.cpu} size={size} />,
      },
      options.showMemory && {
        accessor: "memory",
        width: 140,
        title: (
          <Group gap={4} wrap="nowrap">
            <MemoryStick size={size.iconSize} />
            <Text inherit>{t("column.memory")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.memory} size={size} />,
      },
      options.showDisk && {
        accessor: "disk",
        width: 160,
        title: (
          <Group gap={4} wrap="nowrap">
            <HardDrive size={size.iconSize} />
            <Text inherit>{t("column.disk")}</Text>
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
      options.showGpu && {
        accessor: "gpu",
        width: 140,
        title: (
          <Group gap={4} wrap="nowrap">
            <Monitor size={size.iconSize} />
            <Text inherit>{t("column.gpu")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.gpu} size={size} />,
      },
      options.showLoadAvg && {
        accessor: "loadAvg",
        width: 100,
        title: (
          <Group gap={4} wrap="nowrap">
            <Activity size={size.iconSize} />
            <Text inherit>{t("column.loadAvg")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => (
          <Group gap={8} wrap="nowrap">
            <Indicator color={record.loadAvg ? loadAvgColor(record.loadAvg[0], record.cores) : "gray"} size={7} />
            <Text size={size.fontSize}>{formatLoadAvg(record.loadAvg)}</Text>
          </Group>
        ),
      },
      options.showNet && {
        accessor: "netBytes",
        width: 100,
        title: (
          <Group gap={4} wrap="nowrap">
            <Network size={size.iconSize} />
            <Text inherit>{t("column.net")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => (
          <Text size={size.fontSize} style={{ whiteSpace: "nowrap" }}>
            {formatByteRate(record.netBytes)}
          </Text>
        ),
      },
      options.showTemp && {
        accessor: "temp",
        width: 80,
        title: (
          <Group gap={4} wrap="nowrap">
            <Thermometer size={size.iconSize} />
            <Text inherit>{t("column.temp")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{formatTemp(record.temp, false)}</Text>,
      },
      options.showBattery && {
        accessor: "battery",
        width: 70,
        title: (
          <Group gap={4} wrap="nowrap">
            <Battery size={size.iconSize} />
            <Text inherit>{t("column.battery")}</Text>
          </Group>
        ),
        render: (record) => <Text size={size.fontSize}>{record.battery ? `${record.battery[0]}%` : "—"}</Text>,
      },
      options.showServices && {
        accessor: "services",
        width: 80,
        title: (
          <Group gap={4} wrap="nowrap">
            <Server size={size.iconSize} />
            <Text inherit>{t("column.services")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.services}</Text>,
      },
      options.showUptime && {
        accessor: "uptime",
        width: 90,
        title: (
          <Group gap={4} wrap="nowrap">
            <Activity size={size.iconSize} />
            <Text inherit>{t("column.uptime")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{formatUptime(record.uptime)}</Text>,
      },
      options.showAgent && {
        accessor: "agentVersion",
        width: 90,
        title: (
          <Group gap={4} wrap="nowrap">
            <Wifi size={size.iconSize} />
            <Text inherit>{t("column.agent")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.agentVersion}</Text>,
      },
    ];

    return cols.filter(Boolean) as DataTableColumn<SystemRowWithKey>[];
  }, [
    options.showAgent,
    options.showBattery,
    options.showCpu,
    options.showDisk,
    options.showGpu,
    options.showLoadAvg,
    options.showMemory,
    options.showNet,
    options.showServices,
    options.showTemp,
    options.showUptime,
    size,
    t,
  ]);

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
      const integrationId = record._key.split(":")[0] ?? "";
      openModal({ integrationId, systemId: record.id }, { title: record.name });
    },
    [openModal],
  );

  if (systemsError) throw systemsError;

  if (isPending) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div style={{ position: "absolute", top: 4, right: 8, zIndex: 1 }}>
        <BeszelIntegrationErrorIndicator results={results} />
      </div>
      <HomarrDataTable
        isEditMode={isEditMode}
        cellPadding={`${size.cellPadding}px 8px`}
        fz={size.fontSize}
        records={sortedSystems}
        columns={effectiveColumns}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        noRecordsText={t("noRecords")}
        idAccessor="_key"
        storeColumnsKey={storeKey}
        onRowClick={isEditMode ? undefined : handleRowClick}
      />
    </div>
  );
}
