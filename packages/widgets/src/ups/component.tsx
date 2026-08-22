"use client";

import {
  Badge,
  Box,
  Card,
  Group,
  Progress,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { formatDuration } from "@homarr/common";
import type { UpsStatus, UpsSummary } from "@homarr/integrations/types";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import { NoIntegrationSelectedError } from "../errors/no-integration-selected";

const statusColors: Record<UpsStatus, string> = {
  online: "green",
  charging: "blue",
  onBattery: "yellow",
  lowBattery: "red",
  unknown: "gray",
};

const neutralSurfaceBackground =
  "rgb(from var(--mantine-color-default-hover) r g b / calc(var(--opacity, 1) * 0.12))";
const neutralSurfaceBorder =
  "rgb(from var(--mantine-color-default-border) r g b / calc(var(--opacity, 1) * 0.45))";

type UpsLayout = "mini" | "compact" | "full";

export default function UpsWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"ups">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }

  return (
    <UpsContent
      integrationIds={integrationIds}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
    />
  );
}

interface UpsContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"ups">["options"];
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

function UpsContent({ integrationIds, options, width, height, displayMode }: UpsContentProps) {
  const t = useI18n("widget.ups");
  const summariesQuery = clientApi.widget.ups.getSummaries.useQuery({ integrationIds });
  const data = getUsableWidgetQueryData(summariesQuery);

  if (!data) return <WidgetEmptyState />;

  const devices = getUpsDevices(data);
  const showSource = displayMode === "advanced" || data.length > 1;

  if (devices.length === 0) {
    return (
      <Box h="100%" pos="relative">
        <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
          <IntegrationErrorIndicator results={data} />
          <WidgetQueryErrorIndicator error={summariesQuery.error} label={t("name")} />
        </Group>
        <WidgetEmptyState />
      </Box>
    );
  }

  // Pick a layout from the available width so the widget stays useful at any size. The surrounding
  // ScrollArea keeps every device reachable at any height (e.g. a tall, narrow 1x3 widget scrolls).
  // - full: ring beside a column of stats (runtime, load, voltage)
  // - compact (~2 columns): ring beside the name and a status badge
  // - mini (~1 column): a text badge no longer fits, so status becomes a colour dot next to the name
  const layout: UpsLayout =
    displayMode === "advanced" ? "full" : width < 150 || height < 110 ? "mini" : width < 256 ? "compact" : "full";

  const cards = devices.map(({ key, integrationName, summary }) => (
    <UpsDeviceCard
      key={key}
      summary={summary}
      sourceName={showSource ? integrationName : undefined}
      options={options}
      layout={layout}
      advanced={displayMode === "advanced"}
      t={t}
    />
  ));

  return (
    <Box h="100%" pos="relative">
      <Group pos="absolute" top={4} right={8} gap={0} style={{ zIndex: 2 }}>
        <IntegrationErrorIndicator results={data} />
        <WidgetQueryErrorIndicator error={summariesQuery.error} label={t("name")} />
      </Group>
      <ScrollArea h="100%">
        {displayMode === "advanced" ? (
          <SimpleGrid cols={width >= 760 ? 2 : 1} spacing="md" p="md">
            {cards}
          </SimpleGrid>
        ) : (
          <Stack gap="xs" p="xs">
            {cards}
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}

const statusPriority: Record<UpsStatus, number> = {
  lowBattery: 0,
  onBattery: 1,
  charging: 2,
  unknown: 3,
  online: 4,
};

export const getUpsDevices = <T extends Pick<UpsSummary, "id" | "status">>(
  instances: readonly {
    integrationId: string;
    integrationName: string;
    summaries: readonly T[];
  }[],
) =>
  instances
    .flatMap(({ integrationId, integrationName, summaries }) =>
      summaries.map((summary) => ({
        key: `${integrationId}:${summary.id}`,
        integrationId,
        integrationName,
        summary,
      })),
    )
    .toSorted((left, right) => statusPriority[left.summary.status] - statusPriority[right.summary.status]);

interface UpsDeviceCardProps {
  summary: UpsSummary;
  sourceName?: string;
  options: WidgetComponentProps<"ups">["options"];
  layout: UpsLayout;
  advanced: boolean;
  t: ScopedTranslationFunction<"widget.ups">;
}

function UpsDeviceCard({ summary, sourceName, options, layout, advanced, t }: UpsDeviceCardProps) {
  const showBattery = advanced || options.showBattery;
  const showLoad = advanced || options.showLoad;
  const showVoltage = advanced || options.showVoltage;
  const showRing = showBattery && summary.batteryCharge !== null;
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
      <Card p={6} radius="md" bg="transparent">
        <Group gap={4} wrap="nowrap" justify="center" mb={showRing ? 4 : 0}>
          <Box
            w={8}
            h={8}
            aria-hidden="true"
            style={{
              borderRadius: "50%",
              backgroundColor: `var(--mantine-color-${statusColors[summary.status]}-6)`,
              flexShrink: 0,
            }}
          />
          <VisuallyHidden>{t(`status.${summary.status}`)}</VisuallyHidden>
          <Text fw={600} size="xs" truncate>
            {summary.name}
          </Text>
        </Group>
        {sourceName && (
          <Text size="10px" c="dimmed" ta="center" truncate>
            {sourceName}
          </Text>
        )}
        {showRing && summary.batteryCharge !== null && (
          <Group justify="center">
            <RingProgress
              size={44}
              thickness={4}
              roundCaps
              rootColor={neutralSurfaceBorder}
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
      <Card p={6} radius="md" bg="transparent">
        <Group gap={8} wrap="nowrap" align="center">
          {showRing && summary.batteryCharge !== null && (
            <RingProgress
              size={40}
              thickness={4}
              roundCaps
              rootColor={neutralSurfaceBorder}
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
            {sourceName && (
              <Text size="10px" c="dimmed" truncate>
                {sourceName}
              </Text>
            )}
            {statusBadge}
          </Stack>
        </Group>
      </Card>
    );
  }

  return (
    <Card p="xs" radius="md" bg="transparent">
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text fw={600} size="sm" truncate>
            {summary.name}
          </Text>
          {sourceName && (
            <Text size="xs" c="dimmed" truncate>
              {sourceName}
            </Text>
          )}
        </Stack>
        {statusBadge}
      </Group>

      <Group align="center" wrap="nowrap" gap="md">
        {showRing && summary.batteryCharge !== null && (
          <RingProgress
            size={68}
            thickness={6}
            roundCaps
            rootColor={neutralSurfaceBorder}
            sections={[{ value: clampPercent(summary.batteryCharge), color: getChargeColor(summary.batteryCharge) }]}
            label={
              <Text ta="center" size="xs" fw={700}>
                {Math.round(summary.batteryCharge)}%
              </Text>
            }
          />
        )}

        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          {showBattery && summary.batteryRuntime !== null && (
            <StatRow label={t("field.runtime")} value={formatDuration(summary.batteryRuntime * 1000)} />
          )}

          {showLoad && summary.load !== null && (
            <Box>
              <Group justify="space-between" gap="xs" mb={2}>
                <Text size="xs" c="dimmed">
                  {t("field.load")}
                </Text>
                <Text size="xs">{Math.round(summary.load)}%</Text>
              </Group>
              <Progress
                value={clampPercent(summary.load)}
                size="sm"
                color={getLoadColor(summary.load)}
                styles={{ root: { backgroundColor: neutralSurfaceBackground } }}
              />
            </Box>
          )}

          {showVoltage && (summary.inputVoltage !== null || summary.outputVoltage !== null) && (
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
      {advanced && (
        <SimpleGrid cols={2} spacing={4} mt="sm">
          {summary.batteryVoltage !== null && (
            <StatRow label={t("field.batteryVoltage")} value={`${summary.batteryVoltage} V`} />
          )}
          {summary.power !== null && <StatRow label={t("field.power")} value={`${summary.power} W`} />}
          {summary.temperature !== null && (
            <StatRow label={t("field.temperature")} value={`${summary.temperature} °C`} />
          )}
          {summary.manufacturer && <StatRow label={t("field.manufacturer")} value={summary.manufacturer} />}
          {summary.model && <StatRow label={t("field.model")} value={summary.model} />}
          {summary.serial && <StatRow label={t("field.serial")} value={summary.serial} />}
        </SimpleGrid>
      )}
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
