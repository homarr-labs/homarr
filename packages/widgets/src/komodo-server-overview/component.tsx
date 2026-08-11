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
import type { KomodoResourceStatus, KomodoServerOverviewItem } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";

const statusColors: Record<KomodoResourceStatus, string> = {
  healthy: "green",
  warning: "yellow",
  error: "red",
  unknown: "gray",
};

const formatPercent = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);

const getPercentage = (used: number, total: number) => (total > 0 ? (used / total) * 100 : null);

const getMetricColor = (value: number | null) => (value !== null && value >= 90 ? "yellow" : "green");

const formatByteRate = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";

  const units = ["B/s", "KiB/s", "MiB/s", "GiB/s"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const decimals = unitIndex === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
};

const formatState = (state: string) =>
  state
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());

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
  <Group gap={compact ? 6 : 10} wrap="nowrap" miw={compact ? 0 : 130} style={{ flex: 1 }}>
    <Text size="xs" fw={500} w={42} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
      {formatPercent(value)}
    </Text>
    {value === null ? null : (
      <Progress value={Math.max(0, Math.min(100, value))} color={getMetricColor(value)} size="sm" style={{ flex: 1 }} />
    )}
  </Group>
);

const ServerName = ({ server }: { server: KomodoServerOverviewItem }) => (
  <Tooltip label={formatState(server.state)} openDelay={300}>
    <Group gap="xs" wrap="nowrap">
      <IconServer size={16} color={`var(--mantine-color-${statusColors[server.status]}-6)`} />
      <Text size="sm" fw={500} truncate>
        {server.name}
      </Text>
    </Group>
  </Tooltip>
);

const LoadAverage = ({ server, coresLabel }: { server: KomodoServerOverviewItem; coresLabel: string }) => {
  const load = server.stats?.loadAverage;
  if (!load) return <Text size="xs">—</Text>;

  return (
    <Stack gap={1}>
      <Group gap={8} wrap="nowrap">
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

  const ingress = server.stats.networkIngressBytes;
  const egress = server.stats.networkEgressBytes;
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

export default function KomodoServerOverviewWidget({
  integrationIds,
  options,
  width,
}: WidgetComponentProps<"komodoServerOverview">) {
  const t = useScopedI18n("widget.komodoServerOverview");
  const integrationId = integrationIds[0];
  const { data, error, isPending } = clientApi.widget.komodo.getServers.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: integrationId !== undefined },
  );

  if (error) throw error;

  if (!integrationId) return <WidgetEmptyState />;

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

  const isTableLayout = width >= 700;

  if (!isTableLayout) {
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
                      <Badge size="xs" variant="light" color="green" leftSection={<IconCheck size={10} />}>
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
                      <LoadAverage server={server} coresLabel={t("cores")} />
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

  const visibleMetricColumns = [
    options.showCpu,
    options.showMemory,
    options.showDisk,
    options.showLoadAverage,
    options.showNetwork,
    options.showVersion,
  ].filter(Boolean).length;

  return (
    <ScrollArea h="100%" type="auto" scrollbarSize={5}>
      <Table
        stickyHeader
        highlightOnHover
        verticalSpacing="xs"
        horizontalSpacing="sm"
        style={{ minWidth: 180 + visibleMetricColumns * 130 }}
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t("column.name")}</Table.Th>
            {options.showCpu ? <Table.Th>{t("column.cpu")}</Table.Th> : null}
            {options.showMemory ? <Table.Th>{t("column.memory")}</Table.Th> : null}
            {options.showDisk ? <Table.Th>{t("column.disk")}</Table.Th> : null}
            {options.showLoadAverage ? <Table.Th>{t("column.loadAverage")}</Table.Th> : null}
            {options.showNetwork ? <Table.Th>{t("column.network")}</Table.Th> : null}
            {options.showVersion ? <Table.Th>{t("column.version")}</Table.Th> : null}
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
                <Table.Td miw={160}>
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
                  <Table.Td miw={170}>
                    <LoadAverage server={server} coresLabel={t("cores")} />
                  </Table.Td>
                ) : null}
                {options.showNetwork ? (
                  <Table.Td miw={90}>
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
}
