"use client";

import { Box, Group, Progress, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";

import { getIntegrationName } from "@homarr/definitions";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { healthAlertLabel, percentage, pressureColor, temperature, uptime } from "./display";
import type { HealthOptions } from "./display";
import type { HealthSystemSnapshot } from "./model";
import classes from "./system-view.module.css";

interface SystemTileProps {
  snapshot: HealthSystemSnapshot;
  width: number;
  height: number;
  options: HealthOptions;
  isEditMode: boolean;
  onInspect: () => void;
  standalone?: boolean;
  stale?: boolean;
}

export function SystemTile({
  snapshot,
  width,
  height,
  options,
  isEditMode,
  onInspect,
  standalone,
  stale,
}: SystemTileProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const { formatBytesPair, formatByteRate } = useByteFormatter();
  const roomy = height >= 210;
  const small = height < 135;
  const tight = height < 175;
  const micro = height < 110;
  const { system, memory } = snapshot;
  const metrics: { label: string; value: number; color: string; context?: string }[] = [];
  if (options.cpu && snapshot.cpuPercent !== null)
    metrics.push({ label: t("cpu"), value: snapshot.cpuPercent, color: "blue" });
  if (options.memory && memory) {
    const pair = formatBytesPair(memory.used, memory.total);
    metrics.push({ label: t("memory"), value: memory.percent, color: "teal", context: pair.used + " / " + pair.total });
  }
  if (
    options.fileSystem &&
    snapshot.fullestVolume?.percent !== null &&
    snapshot.fullestVolume?.percent !== undefined &&
    (width >= 270 || metrics.length < 2)
  ) {
    metrics.push({
      label: t("storage"),
      value: snapshot.fullestVolume.percent,
      color: "teal",
      context: snapshot.fullestVolume.name,
    });
  }
  let numberSize = "xl";
  if (width < 280 || small) numberSize = "lg";
  if (width >= 450 && roomy) numberSize = "28px";
  const context: string[] = [getIntegrationName(system.kind)];
  if (!snapshot.available) context.push(t("unavailable"));
  else if (stale) context.push(t("staleShort"));
  else if (snapshot.alerts[0]) context.push(healthAlertLabel(snapshot.alerts[0], t));
  if (
    options.showUptime &&
    roomy &&
    system.health &&
    Number.isFinite(system.health.uptime) &&
    system.health.uptime >= 0
  ) {
    context.push(uptime(system.health.uptime, t));
  }
  const facts: string[] = [];
  if (options.cpu && snapshot.temperature !== null) facts.push(temperature(snapshot.temperature, options.fahrenheit));
  if (snapshot.network && (options.cpu || options.memory)) {
    if (snapshot.network.down !== null) facts.push("↓ " + formatByteRate(snapshot.network.down));
    if (snapshot.network.up !== null && width >= 350) facts.push("↑ " + formatByteRate(snapshot.network.up));
  }
  if (options.gpu && (system.health?.gpu.length ?? 0) > 0)
    facts.push(t("gpuCount", { count: system.health?.gpu.length ?? 0 }));
  if (facts.length === 0 && options.fileSystem && snapshot.volumes.length > 0)
    facts.push(t("volumeCount", { count: snapshot.volumes.length }));
  let stateColor = "teal";
  if (snapshot.alerts.length > 0) stateColor = "orange";
  if (stale || !snapshot.available) stateColor = "gray";
  let padding = 12;
  if (tight) padding = 10;
  if (small) padding = 9;
  if (micro) padding = 6;

  return (
    <UnstyledButton
      className={classes.tile}
      data-standalone={standalone || undefined}
      w="100%"
      h="100%"
      p={padding}
      disabled={isEditMode}
      onClick={(event) => {
        event.stopPropagation();
        onInspect();
      }}
      aria-label={t("inspectSystem", { name: system.name })}
    >
      <Stack h="100%" gap={tight ? 6 : 9} justify="space-between" miw={0} mih={0}>
        <Box miw={0}>
          <Group gap={7} wrap="nowrap">
            <Box
              bg={stateColor}
              style={{ ...zoomCompensatedSize(6), borderRadius: "50%", flexShrink: 0 }}
              aria-hidden
            />
            <Text size="sm" fw={650} truncate flex={1}>
              {system.name}
            </Text>
            <IconArrowUpRight style={zoomCompensatedSize(14)} color="var(--mantine-color-dimmed)" aria-hidden />
          </Group>
          {!small && (
            <Text mt={3} size="xs" c="dimmed" truncate title={context.join(" · ")}>
              {context.join(" · ")}
            </Text>
          )}
        </Box>
        {snapshot.available && metrics.length > 0 && micro && (
          <SimpleGrid cols={metrics.length} spacing={6}>
            {metrics.map((metric) => (
              <Group key={metric.label} gap={4} wrap="nowrap" miw={0}>
                <Text size="xs" c="dimmed" truncate>
                  {metric.label}
                </Text>
                <Text size="xs" fw={650} className={classes.numeric}>
                  {percentage(metric.value)}
                </Text>
              </Group>
            ))}
          </SimpleGrid>
        )}
        {snapshot.available && metrics.length > 0 && !micro && (
          <SimpleGrid cols={metrics.length} spacing="sm">
            {metrics.map((metric) => (
              <Stack key={metric.label} gap={small ? 3 : 5} miw={0}>
                <Text size="xs" c="dimmed" truncate>
                  {metric.label}
                </Text>
                <Text size={numberSize} fw={650} lh={1.1} className={classes.numeric}>
                  {percentage(metric.value)}
                </Text>
                <Progress
                  value={metric.value}
                  color={pressureColor(metric.value, metric.color)}
                  size={3}
                  aria-label={metric.label}
                />
                {roomy && metric.context && (
                  <Text size="xs" c="dimmed" truncate>
                    {metric.context}
                  </Text>
                )}
              </Stack>
            ))}
          </SimpleGrid>
        )}
        {!snapshot.available && (
          <Text size="xs" c="dimmed" lineClamp={small ? 1 : 2}>
            {t("unavailableDescription")}
          </Text>
        )}
        {snapshot.available && metrics.length === 0 && (
          <Text size="xs" c="dimmed">
            {t("noMetrics")}
          </Text>
        )}
        {!small && facts.length > 0 && (
          <Text size="xs" c="dimmed" truncate title={facts.join(" · ")}>
            {facts.join(" · ")}
          </Text>
        )}
      </Stack>
    </UnstyledButton>
  );
}
