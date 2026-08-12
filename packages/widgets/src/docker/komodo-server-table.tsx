"use client";

import type { ReactNode } from "react";
import { Badge, Center, Group, Loader, Paper, Progress, ScrollArea, Stack, Table, Text, Tooltip } from "@mantine/core";
import {
  IconActivity,
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconCpu,
  IconDatabase,
  IconDeviceDesktopAnalytics,
  IconNetwork,
  IconServer,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatByteRate } from "@homarr/common";
import type { KomodoServerOverviewItem } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getKomodoStateTranslationKey, komodoStatusColors, usesKomodoServerTableLayout } from "./komodo-display";
import { getKomodoRefreshIntervalMs } from "./komodo-refresh-interval";

const serverNameColumnMinWidth = 180;
const serverMetricColumnWidths = {
  cpu: 140,
  memory: 140,
  disk: 140,
  loadAverage: 200,
  network: 110,
  version: 110,
} as const;

type ServerMetricColumn = keyof typeof serverMetricColumnWidths;

const formatPercent = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);

const getPercentage = (used: number, total: number) => (total > 0 ? (used / total) * 100 : null);

const getMetricColor = (value: number | null) => (value !== null && value >= 90 ? "yellow" : "green");

const getCoreLabel = (server: KomodoServerOverviewItem) => {
  if (server.logicalCoreCount !== null && server.physicalCoreCount !== null) {
    return `${server.logicalCoreCount} / ${server.physicalCoreCount}`;
  }
  return String(server.logicalCoreCount ?? server.physicalCoreCount ?? "—");
};

interface PercentageMetricProps {
  value: number | null;
  compact?: boolean;
}

const PercentageMetric = ({ value, compact = false }: PercentageMetricProps) => (
  <Group gap={compact ? 6 : 10} wrap="nowrap" miw={0} style={{ flex: 1 }}>
    <Text size="xs" fw={500} w={42} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
      {formatPercent(value)}
    </Text>
    {value === null ? null : (
      <Progress value={Math.max(0, Math.min(100, value))} color={getMetricColor(value)} size="sm" style={{ flex: 1 }} />
    )}
  </Group>
);

const ServerName = ({ server }: { server: KomodoServerOverviewItem }) => {
  const tState = useScopedI18n("widget.dockerContainers.komodo.resourceState");

  return (
    <Tooltip label={tState(getKomodoStateTranslationKey(server.state))} openDelay={300}>
      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, overflow: "hidden" }}>
        <IconServer
          size={16}
          color={`var(--mantine-color-${komodoStatusColors[server.status]}-6)`}
          style={{ flexShrink: 0 }}
        />
        <Text size="sm" fw={500} truncate>
          {server.name}
        </Text>
      </Group>
    </Tooltip>
  );
};

const LoadAverage = ({
  server,
  coresLabel,
  compact = false,
}: {
  server: KomodoServerOverviewItem;
  coresLabel: string;
  compact?: boolean;
}) => {
  const load = server.stats?.loadAverage;
  if (!load) return <Text size="xs">—</Text>;

  return (
    <Stack gap={1} align={compact ? "flex-end" : "stretch"}>
      <Group gap={compact ? 6 : 8} wrap={compact ? "wrap" : "nowrap"} justify={compact ? "flex-end" : "flex-start"}>
        <Text size="xs" style={{ whiteSpace: "nowrap" }}>
          <Text span c="dimmed" inherit>
            1m&nbsp;
          </Text>
          {load.one.toFixed(2)}
        </Text>
        <Text size="xs" style={{ whiteSpace: "nowrap" }}>
          <Text span c="dimmed" inherit>
            5m&nbsp;
          </Text>
          {load.five.toFixed(2)}
        </Text>
        <Text size="xs" style={{ whiteSpace: "nowrap" }}>
          <Text span c="dimmed" inherit>
            15m&nbsp;
          </Text>
          {load.fifteen.toFixed(2)}
        </Text>
      </Group>
      <Text size="10px" c="dimmed">
        {getCoreLabel(server)} {coresLabel}
      </Text>
    </Stack>
  );
};

const NetworkRate = ({ server, detailed = false }: { server: KomodoServerOverviewItem; detailed?: boolean }) => {
  if (!server.stats) return <Text size="xs">—</Text>;

  const ingress = server.stats.networkIngressBytesPerSecond;
  const egress = server.stats.networkEgressBytesPerSecond;
  if (ingress === null || egress === null) return <Text size="xs">—</Text>;

  if (!detailed) {
    return <Text size="xs">{formatByteRate(ingress + egress)}</Text>;
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <Group gap={3} wrap="nowrap">
        <IconArrowDown size={12} color="var(--mantine-color-green-6)" />
        <Text size="xs">{formatByteRate(ingress)}</Text>
      </Group>
      <Group gap={3} wrap="nowrap">
        <IconArrowUp size={12} color="var(--mantine-color-blue-6)" />
        <Text size="xs">{formatByteRate(egress)}</Text>
      </Group>
    </Group>
  );
};

interface CardMetricProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}

const CardMetric = ({ icon, label, children }: CardMetricProps) => (
  <Group gap="xs" wrap="nowrap" justify="space-between">
    <Group gap={6} wrap="nowrap" miw={82}>
      {icon}
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Group>
    <Group justify="flex-end" style={{ flex: 1 }}>
      {children}
    </Group>
  </Group>
);

interface KomodoServerTableProps {
  integrationId: string;
  options: WidgetComponentProps<"dockerContainers">["options"];
  width: number;
}

export const KomodoServerTable = ({ integrationId, options, width }: KomodoServerTableProps) => {
  const t = useScopedI18n("widget.dockerContainers.komodo.server");
  const { data, error, isPending } = clientApi.widget.komodo.getServers.useQuery(
    { integrationId },
    { refetchInterval: getKomodoRefreshIntervalMs(options.refreshInterval) },
  );

  if (error) throw error;

  if (isPending) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  if (!data || data.servers.length === 0) {
    return (
      <Center h="100%">
        <Text size="sm" c="dimmed">
          {t("empty.noServers")}
        </Text>
      </Center>
    );
  }

  if (!usesKomodoServerTableLayout(width)) {
    return (
      <ScrollArea h="100%" type="auto" scrollbarSize={5}>
        <Stack gap="xs" p="xs">
          {data.servers.map((server) => {
            const memoryPercentage = server.stats
              ? getPercentage(server.stats.memoryUsedGb, server.stats.memoryTotalGb)
              : null;
            const diskPercentage = server.stats
              ? getPercentage(server.stats.diskUsedGb, server.stats.diskTotalGb)
              : null;

            return (
              <Paper key={server.id} withBorder radius="md" p="sm">
                <Stack gap="xs">
                  <Group justify="space-between" wrap="nowrap">
                    <ServerName server={server} />
                    {options.showVersion && server.version ? (
                      <Badge
                        size="xs"
                        variant="light"
                        color="green"
                        leftSection={<IconCheck size={10} />}
                        style={{ flexShrink: 0 }}
                      >
                        {server.version}
                      </Badge>
                    ) : null}
                  </Group>
                  {options.showCpu ? (
                    <CardMetric icon={<IconCpu size={14} />} label={t("column.cpu")}>
                      <PercentageMetric value={server.stats?.cpuPercentage ?? null} compact />
                    </CardMetric>
                  ) : null}
                  {options.showMemory ? (
                    <CardMetric icon={<IconDeviceDesktopAnalytics size={14} />} label={t("column.memory")}>
                      <PercentageMetric value={memoryPercentage} compact />
                    </CardMetric>
                  ) : null}
                  {options.showDisk ? (
                    <CardMetric icon={<IconDatabase size={14} />} label={t("column.disk")}>
                      <PercentageMetric value={diskPercentage} compact />
                    </CardMetric>
                  ) : null}
                  {options.showLoadAverage ? (
                    <CardMetric icon={<IconActivity size={14} />} label={t("column.loadAverage")}>
                      <LoadAverage server={server} coresLabel={t("cores")} compact />
                    </CardMetric>
                  ) : null}
                  {options.showNetwork ? (
                    <CardMetric icon={<IconNetwork size={14} />} label={t("column.network")}>
                      <NetworkRate server={server} detailed />
                    </CardMetric>
                  ) : null}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </ScrollArea>
    );
  }

  const metricColumnVisibility: Record<ServerMetricColumn, boolean> = {
    cpu: options.showCpu,
    memory: options.showMemory,
    disk: options.showDisk,
    loadAverage: options.showLoadAverage,
    network: options.showNetwork,
    version: options.showVersion,
  };
  const tableMinWidth = (Object.keys(serverMetricColumnWidths) as ServerMetricColumn[])
    .filter((column) => metricColumnVisibility[column])
    .reduce((total, column) => total + serverMetricColumnWidths[column], serverNameColumnMinWidth);

  return (
    <ScrollArea h="100%" type="auto" scrollbarSize={5}>
      <Table
        stickyHeader
        highlightOnHover
        verticalSpacing="xs"
        horizontalSpacing="sm"
        style={{ minWidth: tableMinWidth, width: "100%", tableLayout: "fixed" }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th miw={serverNameColumnMinWidth}>{t("column.name")}</Table.Th>
            {options.showCpu ? <Table.Th w={serverMetricColumnWidths.cpu}>{t("column.cpu")}</Table.Th> : null}
            {options.showMemory ? <Table.Th w={serverMetricColumnWidths.memory}>{t("column.memory")}</Table.Th> : null}
            {options.showDisk ? <Table.Th w={serverMetricColumnWidths.disk}>{t("column.disk")}</Table.Th> : null}
            {options.showLoadAverage ? (
              <Table.Th w={serverMetricColumnWidths.loadAverage}>{t("column.loadAverage")}</Table.Th>
            ) : null}
            {options.showNetwork ? (
              <Table.Th w={serverMetricColumnWidths.network}>{t("column.network")}</Table.Th>
            ) : null}
            {options.showVersion ? (
              <Table.Th w={serverMetricColumnWidths.version}>{t("column.version")}</Table.Th>
            ) : null}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.servers.map((server) => {
            const memoryPercentage = server.stats
              ? getPercentage(server.stats.memoryUsedGb, server.stats.memoryTotalGb)
              : null;
            const diskPercentage = server.stats
              ? getPercentage(server.stats.diskUsedGb, server.stats.diskTotalGb)
              : null;

            return (
              <Table.Tr key={server.id}>
                <Table.Td style={{ overflow: "hidden" }}>
                  <ServerName server={server} />
                </Table.Td>
                {options.showCpu ? (
                  <Table.Td>
                    <PercentageMetric value={server.stats?.cpuPercentage ?? null} />
                  </Table.Td>
                ) : null}
                {options.showMemory ? (
                  <Table.Td>
                    <PercentageMetric value={memoryPercentage} />
                  </Table.Td>
                ) : null}
                {options.showDisk ? (
                  <Table.Td>
                    <PercentageMetric value={diskPercentage} />
                  </Table.Td>
                ) : null}
                {options.showLoadAverage ? (
                  <Table.Td>
                    <LoadAverage server={server} coresLabel={t("cores")} />
                  </Table.Td>
                ) : null}
                {options.showNetwork ? (
                  <Table.Td>
                    <NetworkRate server={server} />
                  </Table.Td>
                ) : null}
                {options.showVersion ? (
                  <Table.Td>
                    {server.version ? (
                      <Group gap={5} wrap="nowrap">
                        <IconCheck size={14} color="var(--mantine-color-green-6)" />
                        <Text size="xs">{server.version}</Text>
                      </Group>
                    ) : (
                      <Text size="xs">—</Text>
                    )}
                  </Table.Td>
                ) : null}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
};
