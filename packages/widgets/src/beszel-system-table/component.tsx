"use client";

import "./styles.css";

import { useMemo, useState } from "react";
import { Center, Group, Indicator, Loader, Progress, ScrollArea, Stack, Text } from "@mantine/core";
import type { DataTableColumn, DataTableSortStatus } from "mantine-datatable";
import { DataTable } from "mantine-datatable";
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
import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { setWidgetRuntimeQueries } from "../definition";
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
import { BeszelStatsView } from "../beszel/_shared/stats-view";

const directionMultiplier: Record<string, number> = { asc: 1, desc: -1 };

type SystemRowWithKey = BeszelSystemRow & { _key: string };

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
  displayMode = "compact",
  widgetStateRef,
}: WidgetComponentProps<"beszelSystemTable">) {
  const t = useScopedI18n("widget.beszelSystemTable");
  const { openModal } = useModalAction(BeszelSystemStatsModal);
  const {
    data: results = [],
    error: systemsError,
    isPending,
  } = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const size = getSizeConfig(width);
  const [selectedSystem, setSelectedSystem] = useState<SystemRowWithKey | null>(null);

  const visibleMetricKeys = useMemo(() => {
    const enabled = [
      "showCpu",
      "showMemory",
      "showDisk",
      "showGpu",
      "showLoadAvg",
      "showNet",
      "showTemp",
      "showBattery",
      "showServices",
      "showUptime",
      "showAgent",
    ].filter((key) => options[key as keyof typeof options]) as string[];
    const budget =
      displayMode === "advanced"
        ? enabled.length
        : width < 360
          ? 1
          : width < 560
            ? 2
            : width < 760
              ? 4
              : enabled.length;
    return new Set(enabled.slice(0, budget));
  }, [displayMode, options, width]);

  const filteredSystems = useBeszelFilteredSystems(results, options.statusFilter);

  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<SystemRowWithKey>>({
    columnAccessor: options.sortBy,
    direction: options.sortDirection as "asc" | "desc",
  });

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

  const PercentCell = ({ value }: { value: number }) => (
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

  const columns = useMemo((): DataTableColumn<SystemRowWithKey>[] => {
    const cols: (DataTableColumn<SystemRowWithKey> | false)[] = [
      {
        accessor: "name",
        title: (
          <Group gap={4} wrap="nowrap">
            <Server size={size.iconSize} />
            <Text inherit>{t("column.system")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => (
          <Group gap={8} wrap="nowrap">
            <Indicator color={statusColorMap[record.status]} size={7} />
            <Text size={size.fontSize} fw={500} truncate>
              {record.name}
            </Text>
          </Group>
        ),
      },
      visibleMetricKeys.has("showCpu") && {
        accessor: "cpu",
        title: (
          <Group gap={4} wrap="nowrap">
            <Cpu size={size.iconSize} />
            <Text inherit>{t("column.cpu")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.cpu} />,
      },
      visibleMetricKeys.has("showMemory") && {
        accessor: "memory",
        title: (
          <Group gap={4} wrap="nowrap">
            <MemoryStick size={size.iconSize} />
            <Text inherit>{t("column.memory")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.memory} />,
      },
      visibleMetricKeys.has("showDisk") && {
        accessor: "disk",
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
      visibleMetricKeys.has("showGpu") && {
        accessor: "gpu",
        title: (
          <Group gap={4} wrap="nowrap">
            <Monitor size={size.iconSize} />
            <Text inherit>{t("column.gpu")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.gpu} />,
      },
      visibleMetricKeys.has("showLoadAvg") && {
        accessor: "loadAvg",
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
      visibleMetricKeys.has("showNet") && {
        accessor: "netBytes",
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
      visibleMetricKeys.has("showTemp") && {
        accessor: "temp",
        title: (
          <Group gap={4} wrap="nowrap">
            <Thermometer size={size.iconSize} />
            <Text inherit>{t("column.temp")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{formatTemp(record.temp, false)}</Text>,
      },
      visibleMetricKeys.has("showBattery") && {
        accessor: "battery",
        title: (
          <Group gap={4} wrap="nowrap">
            <Battery size={size.iconSize} />
            <Text inherit>{t("column.battery")}</Text>
          </Group>
        ),
        render: (record) => <Text size={size.fontSize}>{record.battery ? `${record.battery[0]}%` : "—"}</Text>,
      },
      visibleMetricKeys.has("showServices") && {
        accessor: "services",
        title: (
          <Group gap={4} wrap="nowrap">
            <Server size={size.iconSize} />
            <Text inherit>{t("column.services")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{record.services}</Text>,
      },
      visibleMetricKeys.has("showUptime") && {
        accessor: "uptime",
        title: (
          <Group gap={4} wrap="nowrap">
            <Activity size={size.iconSize} />
            <Text inherit>{t("column.uptime")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <Text size={size.fontSize}>{formatUptime(record.uptime)}</Text>,
      },
      visibleMetricKeys.has("showAgent") && {
        accessor: "agentVersion",
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
  }, [t, size, visibleMetricKeys]);

  const handleRowClick = ({ record }: { record: SystemRowWithKey }) => {
    if (displayMode === "advanced") {
      setSelectedSystem(record);
      return;
    }
    const integrationId = record._key.split(":")[0] ?? "";
    openModal({ integrationId, systemId: record.id }, { title: record.name });
  };

  const activeSystem = selectedSystem ?? sortedSystems[0];
  const activeIntegrationId = activeSystem?._key.split(":")[0] ?? "";
  setWidgetRuntimeQueries(
    widgetStateRef,
    displayMode === "advanced" && activeSystem
      ? [
          {
            path: ["widget", "beszel", "getSystemStats"],
            input: {
              integrationIds: [activeIntegrationId],
              systemId: activeSystem.id,
              timePeriod: "1h",
              includeDocker: false,
            },
          },
        ]
      : [],
  );

  if (systemsError) throw systemsError;

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
        <BeszelIntegrationErrorIndicator results={results} />
      </div>
      <DataTable
        style={{ pointerEvents: isEditMode ? "none" : undefined }}
        withTableBorder={false}
        borderRadius={0}
        highlightOnHover
        fz={size.fontSize}
        records={sortedSystems}
        columns={columns}
        sortStatus={sortStatus}
        onSortStatusChange={setSortStatus}
        noRecordsText={t("noRecords")}
        idAccessor="_key"
        height="100%"
        className="beszel-table"
        onRowClick={isEditMode ? undefined : handleRowClick}
      />
    </div>
  );

  if (displayMode === "compact") return table;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: width >= 900 ? "minmax(0, 3fr) minmax(320px, 2fr)" : "1fr",
        height: "100%",
        gap: 12,
        padding: 12,
      }}
    >
      {table}
      {activeSystem && (
        <ScrollArea h="100%">
          <Stack gap="sm">
            <Text fw={700}>{activeSystem.name}</Text>
            <BeszelStatsView
              integrationIds={[activeIntegrationId]}
              systemId={activeSystem.id}
              timePeriod="1h"
              columns={1}
              visibility={{
                cpu: options.showCpu,
                memory: options.showMemory,
                disk: options.showDisk,
                diskIO: options.showDisk,
                network: options.showNet,
                dockerCpu: false,
                dockerMemory: false,
                dockerNetwork: false,
              }}
            />
          </Stack>
        </ScrollArea>
      )}
    </div>
  );
}
