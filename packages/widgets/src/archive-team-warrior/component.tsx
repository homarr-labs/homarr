"use client";

import { Avatar, Badge, Card, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { formatByteRate } from "@homarr/common";
import { getIconUrl } from "@homarr/definitions";
import { useCurrentLocale, useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

export default function ArchiveTeamWarriorWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"archiveTeamWarrior">) {
  const integrationId = integrationIds[0];

  if (!integrationId) {
    return null;
  }

  return (
    <ArchiveTeamWarriorWidgetContent
      integrationId={integrationId}
      options={options}
      width={width}
      height={height}
      isAdvanced={displayMode === "advanced"}
    />
  );
}

const ArchiveTeamWarriorWidgetContent = ({
  integrationId,
  options,
  width,
  height,
  isAdvanced,
}: {
  integrationId: string;
  options: WidgetComponentProps<"archiveTeamWarrior">["options"];
  width: number;
  height: number;
  isAdvanced: boolean;
}) => {
  const t = useScopedI18n("widget.archiveTeamWarrior");
  const locale = useCurrentLocale();
  const [data] = clientApi.widget.archiveTeamWarrior.getStatus.useSuspenseQuery({ integrationId });

  const status = data.status;
  const projectName = status.project?.title ?? status.selectedProject ?? t("noProjectSelected");
  const statusKey = getStatusKey(status.status);
  const layout = getArchiveCompactLayout(width, height, isAdvanced);
  const countMetrics = [
    { label: t("metric.running"), value: status.counts.running },
    ...(layout.showSecondaryCounts ? [{ label: t("metric.completed"), value: status.counts.completed }] : []),
    { label: t("metric.failed"), value: status.counts.failed },
    ...(layout.showSecondaryCounts ? [{ label: t("metric.canceled"), value: status.counts.canceled }] : []),
  ];

  return (
    <Stack p="xs" gap={layout.gap} h="100%" style={{ overflow: "hidden" }}>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Avatar size="sm" radius="md" src={getIconUrl("archiveTeamWarrior")} />
          <Text size="sm" c="dimmed" lineClamp={1}>
            {projectName}
          </Text>
        </Group>

        <Badge size="sm" color={getStatusColor(statusKey)}>
          {t(`status.${statusKey}`)}
        </Badge>
      </Group>

      {options.showBroadcastMessage && status.broadcastMessage && layout.showBroadcast && (
        <Card withBorder p="xs">
          <Text size="xs" lineClamp={3}>
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
          <Metric label={t("metric.download")} value={formatBandwidth(status.bandwidth.receiving)} dense />
          <Metric label={t("metric.upload")} value={formatBandwidth(status.bandwidth.sending)} dense />
        </SimpleGrid>
      )}
      {isAdvanced && (
        <>
          <Group justify="space-between" gap="xs">
            <Text size="xs" c="dimmed">
              {t("runnerStatus", { status: t(`status.${getStatusKey(status.runnerStatus ?? status.status)}`) })}
            </Text>
            <Text size="xs" c="dimmed">
              {t("updatedAt", { date: new Date(status.updatedAt).toLocaleString(locale) })}
            </Text>
          </Group>
          <ScrollArea style={{ flex: 1 }}>
            <Stack gap={4}>
              {status.items.map((item) => {
                const itemStatusKey = getStatusKey(item.status);
                return (
                  <Card key={item.id} withBorder p="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap={0} miw={0}>
                        <Text size="sm" fw={600} lineClamp={1}>
                          {item.name}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {item.project ?? projectName}
                        </Text>
                      </Stack>
                      <Badge size="xs" color={getStatusColor(itemStatusKey)}>
                        {t(`status.${itemStatusKey}`)}
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

const formatBandwidth = (value?: number) => formatByteRate(Math.round(value ?? 0));

type WarriorStatusKey = "running" | "completed" | "failed" | "canceled" | "stopped" | "idle" | "unknown";

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
