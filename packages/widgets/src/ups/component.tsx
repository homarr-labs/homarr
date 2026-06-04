"use client";

import { Badge, Box, Card, Group, Progress, RingProgress, ScrollArea, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { formatDuration } from "@homarr/common";
import type { UpsStatus, UpsSummary } from "@homarr/integrations/types";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { NoIntegrationSelectedError } from "../errors/no-integration-selected";

const statusColors: Record<UpsStatus, string> = {
  online: "green",
  charging: "blue",
  onBattery: "yellow",
  lowBattery: "red",
  unknown: "gray",
};

export default function UpsWidget({ options, integrationIds, isEditMode }: WidgetComponentProps<"ups">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }

  return <UpsContent integrationIds={integrationIds} options={options} isEditMode={isEditMode} />;
}

interface UpsContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"ups">["options"];
  isEditMode: boolean;
}

function UpsContent({ integrationIds, options, isEditMode }: UpsContentProps) {
  const t = useScopedI18n("widget.ups");
  const [data] = clientApi.widget.ups.getSummaries.useSuspenseQuery({ integrationIds });

  const utils = clientApi.useUtils();
  clientApi.widget.ups.subscribeSummaries.useSubscription(
    { integrationIds },
    {
      enabled: !isEditMode,
      onData(newData) {
        utils.widget.ups.getSummaries.setData({ integrationIds }, (prevData) => {
          if (!prevData) return prevData;
          return prevData.map((instance) =>
            instance.integrationId === newData.integrationId
              ? { ...instance, summaries: newData.summaries, updatedAt: newData.timestamp }
              : instance,
          );
        });
      },
    },
  );

  const devices = data.flatMap((instance) =>
    instance.summaries.map((summary) => ({ key: `${instance.integrationId}:${summary.id}`, summary })),
  );

  if (devices.length === 0) {
    throw new NoIntegrationDataError();
  }

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {devices.map(({ key, summary }) => (
          <UpsDeviceCard key={key} summary={summary} options={options} t={t} />
        ))}
      </Stack>
    </ScrollArea>
  );
}

interface UpsDeviceCardProps {
  summary: UpsSummary;
  options: WidgetComponentProps<"ups">["options"];
  t: ScopedTranslationFunction<"widget.ups">;
}

function UpsDeviceCard({ summary, options, t }: UpsDeviceCardProps) {
  return (
    <Card p="xs" radius="md">
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <Text fw={600} size="sm" truncate>
          {summary.name}
        </Text>
        <Badge color={statusColors[summary.status]} variant="light" size="sm" style={{ flexShrink: 0 }}>
          {t(`status.${summary.status}`)}
        </Badge>
      </Group>

      <Group align="center" wrap="nowrap" gap="md">
        {options.showBattery && summary.batteryCharge !== null && (
          <RingProgress
            size={68}
            thickness={6}
            roundCaps
            sections={[{ value: clampPercent(summary.batteryCharge), color: getChargeColor(summary.batteryCharge) }]}
            label={
              <Text ta="center" size="xs" fw={700}>
                {Math.round(summary.batteryCharge)}%
              </Text>
            }
          />
        )}

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {options.showBattery && summary.batteryRuntime !== null && (
            <StatRow label={t("field.runtime")} value={formatDuration(summary.batteryRuntime * 1000)} />
          )}

          {options.showLoad && summary.load !== null && (
            <Box>
              <Group justify="space-between" gap="xs" mb={2}>
                <Text size="xs" c="dimmed">
                  {t("field.load")}
                </Text>
                <Text size="xs">{Math.round(summary.load)}%</Text>
              </Group>
              <Progress value={clampPercent(summary.load)} size="sm" color={getLoadColor(summary.load)} />
            </Box>
          )}

          {options.showVoltage && (summary.inputVoltage !== null || summary.outputVoltage !== null) && (
            <Group gap="md">
              {summary.inputVoltage !== null && (
                <StatRow label={t("field.input")} value={`${Math.round(summary.inputVoltage)} V`} />
              )}
              {summary.outputVoltage !== null && (
                <StatRow label={t("field.output")} value={`${Math.round(summary.outputVoltage)} V`} />
              )}
            </Group>
          )}
        </Stack>
      </Group>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xs" fw={500}>
        {value}
      </Text>
    </Group>
  );
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function getChargeColor(charge: number): string {
  if (charge > 50) return "green";
  if (charge > 20) return "yellow";
  return "red";
}

function getLoadColor(load: number): string {
  if (load > 90) return "red";
  if (load > 70) return "yellow";
  return "blue";
}
