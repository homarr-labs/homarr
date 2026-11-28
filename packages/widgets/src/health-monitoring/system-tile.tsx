"use client";

import { Box, Group, Progress, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";

import { getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { getHealthMetricOrder } from "./configuration";
import type { HealthOptions } from "./display";
import { uptime } from "./display";
import { useGlanceReadings } from "./glance-readings";
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
  stale = false,
}: SystemTileProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const glance = useGlanceReadings(options);
  const status = glance.status(snapshot, stale);
  const readings = getHealthMetricOrder(options).flatMap((metric) => {
    const reading = glance.read(snapshot, metric);
    if (!reading) return [];
    return [{ ...reading, label: glance.label(metric) }];
  });
  const compact = options.density === "compact" || height < 110;
  const roomy = height >= 185 && options.density !== "compact";
  let padding = 12;
  if (height < 150 || width < 230) padding = 8;
  if (compact) padding = 5;
  const innerWidth = Math.max(0, width - padding * 2);
  let columnWidth = 80;
  if (compact) columnWidth = 67;
  if (options.density === "comfortable") columnWidth = 100;
  const columns = Math.max(1, Math.min(4, Math.floor(innerWidth / columnWidth)));
  let capacity = columns;
  if (roomy && height >= 250) capacity *= 2;
  const primary = readings.slice(0, capacity);
  const supporting = readings.slice(capacity);
  const details: string[] = [];
  if (snapshot.displayName === snapshot.system.name) details.push(getIntegrationName(snapshot.system.kind));
  if (
    options.showUptime &&
    snapshot.system.health &&
    snapshot.system.health.uptime !== null &&
    Number.isFinite(snapshot.system.health.uptime) &&
    snapshot.system.health.uptime >= 0
  )
    details.push(uptime(snapshot.system.health.uptime, t));
  let subtitle = status;
  if (roomy) subtitle = [status, ...details].filter(Boolean).join(" · ");
  let stateColor = "teal";
  if (snapshot.alerts.length > 0) stateColor = "orange";
  if (stale || !snapshot.available) stateColor = "gray";
  const description = [
    status,
    ...details,
    ...readings.map((reading) => reading.label + " " + (reading.description ?? reading.value)),
  ]
    .filter(Boolean)
    .join(", ");

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
      aria-label={t("inspectSystem", { name: snapshot.displayName })}
      aria-description={description}
    >
      <Stack h="100%" gap={compact ? 2 : 6} justify="space-between" miw={0} mih={0}>
        <Box miw={0}>
          <Group gap={6} wrap="nowrap">
            <Box
              bg={stateColor}
              style={{ ...zoomCompensatedSize(6), borderRadius: "50%", flexShrink: 0 }}
              aria-hidden
            />
            <Text size="sm" lh={1.2} fw={650} truncate flex={1}>
              {snapshot.displayName}
            </Text>
            <IconArrowUpRight style={zoomCompensatedSize(14)} color="var(--mantine-color-dimmed)" aria-hidden />
          </Group>
          {subtitle && (
            <Text mt={2} size="xs" lh={1.2} c="dimmed" truncate title={description}>
              {subtitle}
            </Text>
          )}
        </Box>
        {primary.length > 0 && (
          <SimpleGrid cols={Math.min(primary.length, columns)} spacing={6} verticalSpacing={6} miw={0}>
            {primary.map((reading) => (
              <Stack
                key={reading.label}
                gap={2}
                miw={0}
                title={[reading.label, reading.description ?? reading.value, reading.context]
                  .filter(Boolean)
                  .join(" · ")}
              >
                <Text size="xs" c="dimmed" lh={1.1} truncate>
                  {reading.label}
                </Text>
                <Text size={compact ? "sm" : "lg"} fw={650} lh={1.1} className={classes.numeric} truncate>
                  {reading.value}
                </Text>
                {!compact && reading.percent !== undefined && (
                  <Progress value={reading.percent} size={3} color={reading.color} aria-label={reading.label} />
                )}
                {roomy && reading.context && (
                  <Text size="xs" c="dimmed" truncate>
                    {reading.context}
                  </Text>
                )}
              </Stack>
            ))}
          </SimpleGrid>
        )}
        {snapshot.available && readings.length === 0 && (
          <Text size="xs" c="dimmed">
            {t("noMetrics")}
          </Text>
        )}
        {!snapshot.available && height >= 115 && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {t("unavailableDescription")}
          </Text>
        )}
        {roomy && supporting.length > 0 && (
          <Text size="xs" c="dimmed" truncate>
            {supporting.map((reading) => reading.label + " " + reading.value).join(" · ")}
          </Text>
        )}
      </Stack>
    </UnstyledButton>
  );
}
