"use client";

import { Badge, Box, Card, Group, Progress, RingProgress, ScrollArea, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { formatDuration } from "@homarr/common";
import type { UpsStatus, UpsSummary } from "@homarr/integrations/types";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
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

type UpsLayout = "mini" | "compact" | "full";

export default function UpsWidget({ options, integrationIds, isEditMode, width }: WidgetComponentProps<"ups">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }

  return <UpsContent integrationIds={integrationIds} options={options} isEditMode={isEditMode} width={width} />;
}

interface UpsContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"ups">["options"];
  isEditMode: boolean;
  width: number;
}

function UpsContent({ integrationIds, options, isEditMode, width }: UpsContentProps) {
  const t = useScopedI18n("widget.ups");
  const { data } = clientApi.widget.ups.getSummaries.useQuery({ integrationIds }, { staleTime: 30 * 1000 });

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

  if (!data) return <WidgetEmptyState />;

  const devices = data.flatMap((instance) =>
    instance.summaries.map((summary) => ({ key: `${instance.integrationId}:${summary.id}`, summary })),
  );

  if (devices.length === 0) {
    throw new NoIntegrationDataError();
  }

  // Pick a layout from the available width so the widget stays useful at any size. The surrounding
  // ScrollArea keeps every device reachable at any height (e.g. a tall, narrow 1x3 widget scrolls).
  // - full: ring beside a column of stats (runtime, load, voltage)
  // - compact (~2 columns): ring beside the name and a status badge
  // - mini (~1 column): a text badge no longer fits, so status becomes a colour dot next to the name
  const layout: UpsLayout = width < 150 ? "mini" : width < 256 ? "compact" : "full";

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {devices.map(({ key, summary }) => (
          <UpsDeviceCard key={key} summary={summary} options={options} layout={layout} t={t} />
        ))}
      </Stack>
    </ScrollArea>
  );
}

interface UpsDeviceCardProps {
  summary: UpsSummary;
  options: WidgetComponentProps<"ups">["options"];
  layout: UpsLayout;
  t: ScopedTranslationFunction<"widget.ups">;
}

function UpsDeviceCard({ summary, options, layout, t }: UpsDeviceCardProps) {
  const showRing = options.showBattery && summary.batteryCharge !== null;
  const statusBadge = (
    <Badge
      color={statusColors[summary.status]}
      variant="light"
      size={layout === "full" ? "sm" : "xs"}
      style={{ flexShrink: 0 }}
    >
      {t(`status.${summary.status}`)}
    </Badge>
  );

  if (layout === "mini") {
    return (
      <Card p={6} radius="md">
        <Group gap={4} wrap="nowrap" justify="center" mb={showRing ? 4 : 0}>
          <Box
            w={8}
            h={8}
            style={{
              borderRadius: "50%",
              backgroundColor: `var(--mantine-color-${statusColors[summary.status]}-6)`,
              flexShrink: 0,
            }}
          />
          <Text fw={600} size="xs" truncate>
            {summary.name}
          </Text>
        </Group>
        {showRing && summary.batteryCharge !== null && (
          <Group justify="center">
            <RingProgress
              size={44}
              thickness={4}
              roundCaps
              sections={[{ value: clampPercent(summary.batteryCharge), color: getChargeColor(summary.batteryCharge) }]}
              label={
                <Text ta="center" size="10px" fw={700}>
                  {Math.round(summary.batteryCharge)}%
                </Text>
              }
            />
          </Group>
        )}
      </Card>
    );
  }

  if (layout === "compact") {
    return (
      <Card p={6} radius="md">
        <Group gap={8} wrap="nowrap" align="center">
          {showRing && summary.batteryCharge !== null && (
            <RingProgress
              size={40}
              thickness={4}
              roundCaps
              sections={[{ value: clampPercent(summary.batteryCharge), color: getChargeColor(summary.batteryCharge) }]}
              label={
                <Text ta="center" size="9px" fw={700}>
                  {Math.round(summary.batteryCharge)}%
                </Text>
              }
            />
          )}
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="xs" truncate>
              {summary.name}
            </Text>
            {statusBadge}
          </Stack>
        </Group>
      </Card>
    );
  }

  return (
    <Card p="xs" radius="md">
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <Text fw={600} size="sm" truncate>
          {summary.name}
        </Text>
        {statusBadge}
      </Group>

      <Group align="center" wrap="nowrap" gap="md">
        {showRing && summary.batteryCharge !== null && (
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
