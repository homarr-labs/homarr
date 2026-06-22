"use client";

import "./styles.css";

import { useMemo, useState } from "react";
import { Center, Group, Indicator, Loader, Progress, Text } from "@mantine/core";
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
import type { BeszelSystemRow } from "../beszel/_shared/types";
import { loadAvgColor, statusColorMap, thresholdColor } from "../beszel/_shared/colors";
import { formatByteRate, formatLoadAvg, formatPercent, formatTemp, formatUptime } from "../beszel/_shared/format";
import { useBeszelFilteredSystems, useBeszelSystemsSubscription } from "../beszel/_shared/hooks";
import { BeszelIntegrationErrorIndicator } from "../beszel/_shared/error-indicator";
import { BeszelSystemStatsModal } from "../beszel/_shared/system-stats-modal";

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
}: WidgetComponentProps<"beszelSystemTable">) {
  const t = useScopedI18n("widget.beszelSystemTable");
  const { openModal } = useModalAction(BeszelSystemStatsModal);
  const {
    data: results = [],
    error: systemsError,
    isPending,
  } = clientApi.widget.beszel.getSystems.useQuery(
    { integrationIds },
    { staleTime: 10_000, gcTime: 48 * 60 * 60 * 1000, refetchInterval: 10_000, retry: false },
  );
  const size = getSizeConfig(width);

  useBeszelSystemsSubscription(integrationIds, !isEditMode);
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
    <Group gap={4} wrap="nowrap" style={{ flex: 1 }}>
      <Text size={size.fontSize} fw={500} miw={size.valueMiw} ta="right" style={{ whiteSpace: "nowrap" }}>
        {formatPercent(value)}
      </Text>
      <Progress value={value} color={thresholdColor(value)} size={size.progressSize} style={{ flex: 1 }} />
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
      options.showCpu && {
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
      options.showMemory && {
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
      options.showDisk && {
        accessor: "disk",
        title: (
          <Group gap={4} wrap="nowrap">
            <HardDrive size={size.iconSize} />
            <Text inherit>{t("column.disk")}</Text>
          </Group>
        ),
        sortable: true,
        render: (record) => <PercentCell value={record.disk} />,
      },
      options.showGpu && {
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
      options.showLoadAvg && {
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
      options.showNet && {
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
      options.showTemp && {
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
      options.showBattery && {
        accessor: "battery",
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
  }, [options, t, size]);

  const handleRowClick = ({ record }: { record: SystemRowWithKey }) => {
    const integrationId = record._key.split(":")[0] ?? "";
    openModal({ integrationId, systemId: record.id }, { title: record.name });
  };

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
}
