"use client";

import { Avatar, Badge, Card, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

export interface ArchiveTeamWarriorDisplayStatus {
  status: string;
  runnerStatus?: string;
  project?: { id?: string; title: string } | null;
  selectedProject?: string | null;
  broadcastMessage?: string | null;
  bandwidth?: { received?: number; sent?: number; receiving?: number; sending?: number; session_id?: string } | null;
  items: { id: string; name: string; status: string; project?: string | null; startTime?: number }[];
  counts: { running: number; completed: number; failed: number; canceled: number };
  updatedAt: string;
}

export interface ArchiveTeamWarriorNativeViewProps {
  status: ArchiveTeamWarriorDisplayStatus;
  options: { showBroadcastMessage: boolean };
  width: number;
  height: number;
  isAdvanced: boolean;
  locale: string;
  iconUrl: string;
  formatBytes: (value: number) => string;
  formatByteRate: (value: number) => string;
  labels: {
    noProjectSelected: string;
    status: (key: WarriorStatusKey) => string;
    metric: Record<"running" | "completed" | "failed" | "canceled" | "download" | "upload", string>;
    runnerStatus: (status: string) => string;
    updatedAt: (date: string) => string;
    projectId: (id: string) => string;
    sessionReceived: (value: string) => string;
    sessionSent: (value: string) => string;
    sessionId: (id: string) => string;
    emptyItems: string;
    startedAt: (date: string) => string;
  };
}

export const ArchiveTeamWarriorNativeView = ({
  status,
  options,
  width,
  height,
  isAdvanced,
  locale,
  iconUrl,
  formatBytes,
  formatByteRate,
  labels,
}: ArchiveTeamWarriorNativeViewProps) => {
  const projectName = status.project?.title ?? status.selectedProject ?? labels.noProjectSelected;
  const statusKey = getStatusKey(status.status);
  const layout = getArchiveCompactLayout(width, height, isAdvanced);
  const countMetrics = [
    { label: labels.metric.running, value: status.counts.running },
    ...(layout.showSecondaryCounts ? [{ label: labels.metric.completed, value: status.counts.completed }] : []),
    { label: labels.metric.failed, value: status.counts.failed },
    ...(layout.showSecondaryCounts ? [{ label: labels.metric.canceled, value: status.counts.canceled }] : []),
  ];
  const formatBandwidth = (value?: number) => formatByteRate(Math.round(value ?? 0));

  return (
    <Stack p="xs" gap={layout.gap} h="100%" style={{ overflow: "hidden" }}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Avatar size="sm" radius="md" src={iconUrl} />
          <Text size="sm" c="dimmed" lineClamp={1}>
            {projectName}
          </Text>
        </Group>

        <Group gap={4} wrap="nowrap">
          <Badge size="sm" color={getStatusColor(statusKey)}>
            {labels.status(statusKey)}
          </Badge>
        </Group>
      </Group>

      {(isAdvanced || options.showBroadcastMessage) && status.broadcastMessage && layout.showBroadcast && (
        <Card withBorder p="xs" bg="transparent" style={{ borderColor: neutralSurfaceBorder }}>
          <Text size="xs" lineClamp={isAdvanced ? undefined : 3}>
            {status.broadcastMessage}
          </Text>
        </Card>
      )}

      <SimpleGrid cols={layout.metricColumns} spacing={layout.gap}>
        {countMetrics.map((metric) => (
          <Metric key={metric.label} {...metric} dense={layout.dense} />
        ))}
      </SimpleGrid>

      {status.bandwidth && layout.showBandwidth && (
        <SimpleGrid cols={2} spacing={layout.gap}>
          <Metric label={labels.metric.download} value={formatBandwidth(status.bandwidth.receiving)} dense />
          <Metric label={labels.metric.upload} value={formatBandwidth(status.bandwidth.sending)} dense />
        </SimpleGrid>
      )}
      {isAdvanced && (
        <>
          <Group justify="space-between" gap="xs">
            <Text size="xs" c="dimmed">
              {labels.runnerStatus(labels.status(getStatusKey(status.runnerStatus ?? status.status)))}
            </Text>
            <Text size="xs" c="dimmed">
              {labels.updatedAt(new Date(status.updatedAt).toLocaleString(locale))}
            </Text>
          </Group>
          <Group gap="xs" wrap="wrap">
            {status.project?.id && (
              <Badge size="xs" variant="light">
                {labels.projectId(status.project.id)}
              </Badge>
            )}
            {status.bandwidth?.received !== undefined && (
              <Text size="xs" c="dimmed">
                {labels.sessionReceived(formatBytes(Math.round(status.bandwidth.received)))}
              </Text>
            )}
            {status.bandwidth?.sent !== undefined && (
              <Text size="xs" c="dimmed">
                {labels.sessionSent(formatBytes(Math.round(status.bandwidth.sent)))}
              </Text>
            )}
            {status.bandwidth?.session_id && (
              <Text size="xs" c="dimmed">
                {labels.sessionId(status.bandwidth.session_id)}
              </Text>
            )}
          </Group>
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap={4}>
              {status.items.length === 0 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  {labels.emptyItems}
                </Text>
              )}
              {status.items.map((item) => {
                const itemStatusKey = getStatusKey(item.status);
                return (
                  <Card key={item.id} withBorder p="xs" bg="transparent" style={{ borderColor: neutralSurfaceBorder }}>
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap={0} miw={0}>
                        <Text size="sm" fw={600} lineClamp={1}>
                          {item.name}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {item.project ?? projectName}
                        </Text>
                        {item.startTime !== undefined && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {labels.startedAt(new Date(item.startTime * 1000).toLocaleString(locale))}
                          </Text>
                        )}
                      </Stack>
                      <Badge size="xs" color={getStatusColor(itemStatusKey)}>
                        {labels.status(itemStatusKey)}
                      </Badge>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </ScrollArea>
        </>
      )}
    </Stack>
  );
};

const Metric = ({ label, value, dense = false }: { label: string; value: number | string; dense?: boolean }) => (
  <Stack gap={0} miw={0}>
    <Text size={dense ? "sm" : "md"} fw={700} lineClamp={1} title={String(value)}>
      {value}
    </Text>
    <Text size="xs" c="dimmed" lineClamp={1} title={label}>
      {label}
    </Text>
  </Stack>
);

export const getArchiveCompactLayout = (width: number, height: number, isAdvanced = false) => {
  const dense = !isAdvanced && (width < 240 || height < 160);
  const showSecondaryCounts = isAdvanced || (width >= 200 && height >= 120);
  const metricCount = showSecondaryCounts ? 4 : 2;

  return {
    dense,
    gap: dense ? 4 : "xs",
    metricColumns: height < 160 ? metricCount : Math.min(metricCount, width >= 260 ? 4 : 2),
    showBandwidth: isAdvanced || height >= 190,
    showBroadcast: isAdvanced || height >= 240,
    showSecondaryCounts,
  } as const;
};

const neutralSurfaceBorder = "rgb(from var(--mantine-color-default-border) r g b / calc(var(--opacity, 1) * 0.45))";

export type WarriorStatusKey = "running" | "completed" | "failed" | "canceled" | "stopped" | "idle" | "unknown";

const getStatusKey = (status?: string | null): WarriorStatusKey => {
  switch (status?.trim().toLowerCase()) {
    case "running":
      return "running";
    case "done":
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "canceled":
    case "cancelled":
      return "canceled";
    case "stopped":
      return "stopped";
    case "idle":
      return "idle";
    default:
      return "unknown";
  }
};

const getStatusColor = (status: WarriorStatusKey): string => {
  if (status === "running") return "green";
  if (status === "failed") return "red";
  if (status === "canceled" || status === "stopped") return "yellow";
  return "gray";
};
