"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ActionIcon, Box, Group, Progress, SimpleGrid, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconChevronLeft, IconChevronRight, IconFilter } from "@tabler/icons-react";

import { getIntegrationName } from "@homarr/definitions";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { useWidgetNow } from "../common/use-widget-now";
import { healthAlertLabel, isStaleReading, percentage, pressureColor, temperature, uptime } from "./display";
import type { HealthOptions } from "./display";
import type { HealthSystemSnapshot } from "./model";
import classes from "./system-view.module.css";

interface FleetProps {
  snapshots: HealthSystemSnapshot[];
  width: number;
  height: number;
  options: HealthOptions;
  isEditMode: boolean;
  onInspect: (id: string) => void;
  onPreferences: (options: Partial<HealthOptions>) => void;
}

interface Column {
  key: string;
  label: string;
  fraction: number;
  render: (snapshot: HealthSystemSnapshot) => ReactNode;
}

export function SystemFleet({ snapshots, width, height, options, isEditMode, onInspect, onPreferences }: FleetProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const { formatBytes, formatBytesPair, formatByteRate } = useByteFormatter();
  const [page, setPage] = useState(0);
  const now = useWidgetNow()?.getTime();
  const isStale = (snapshot: HealthSystemSnapshot) => isStaleReading(snapshot.system.updatedAt, now);
  const needsAttention = (snapshot: HealthSystemSnapshot) =>
    !snapshot.available || snapshot.alerts.length > 0 || isStale(snapshot);
  const attention = snapshots.filter(needsAttention).length;
  let filtered = snapshots;
  if (options.healthFilter === "attention") filtered = snapshots.filter(needsAttention);
  const narrow = width < 560;
  const dense = height < 150;
  let padding = 8;
  let toolbarHeight = 28;
  let actionSize = "md";
  if (dense) {
    padding = 4;
    toolbarHeight = 24;
    actionSize = "sm";
  }
  let columnHeight = 18;
  if (narrow) columnHeight = 0;
  let reservedHeight = padding * 2 + toolbarHeight + 4;
  if (!narrow) reservedHeight += columnHeight + 4;
  const bodyHeight = Math.max(0, height - reservedHeight);
  let minimumRow = 38;
  let maximumRow = 52;
  if (narrow) {
    minimumRow = 64;
    maximumRow = 76;
    if (bodyHeight < 220) minimumRow = 48;
  }
  const preferredRows = Math.max(1, Math.min(filtered.length, 8));
  let rowHeight = Math.min(maximumRow, Math.max(minimumRow, Math.floor(bodyHeight / preferredRows)));
  if (bodyHeight < rowHeight) rowHeight = Math.max(28, bodyHeight);
  const pageSize = Math.max(1, Math.floor(bodyHeight / rowHeight));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, (current + 1) * pageSize);
  const columns: Column[] = [];
  if (options.cpu && snapshots.some((snapshot) => snapshot.cpuPercent !== null))
    columns.push({
      key: "cpu",
      label: t("cpu"),
      fraction: 1,
      render: (snapshot) => (
        <Metric
          label={t("cpu")}
          value={snapshot.cpuPercent}
          color="blue"
          inline={narrow}
          withBar={rowHeight >= 58 || !narrow}
        />
      ),
    });
  if (options.memory && snapshots.some((snapshot) => snapshot.memory !== null))
    columns.push({
      key: "memory",
      label: t("memory"),
      fraction: 1,
      render: (snapshot) => {
        let detail;
        let title;
        if (snapshot.memory) {
          const memory = formatBytesPair(snapshot.memory.used, snapshot.memory.total);
          title = memory.used + " / " + memory.total;
          if (rowHeight >= 48 && !narrow) detail = formatBytes(snapshot.memory.used);
        }
        return (
          <Metric
            label={t("memory")}
            value={snapshot.memory?.percent ?? null}
            color="teal"
            detail={detail}
            title={title}
            inline={narrow}
            withBar={rowHeight >= 58 || !narrow}
          />
        );
      },
    });
  if (options.fileSystem && snapshots.some((snapshot) => snapshot.volumes.length > 0))
    columns.push({
      key: "storage",
      label: t("storage"),
      fraction: 1,
      render: (snapshot) => {
        if (snapshot.fullestVolume)
          return (
            <Metric
              label={t("storage")}
              value={snapshot.fullestVolume.percent}
              color="teal"
              title={snapshot.fullestVolume.name}
              inline={narrow}
              withBar={rowHeight >= 58 || !narrow}
            />
          );
        let verdict = "—";
        if (snapshot.storageHealth === "healthy") verdict = t("healthy");
        if (snapshot.storageHealth === "attention") verdict = t("attention");
        return (
          <Text size="xs" truncate>
            {verdict}
          </Text>
        );
      },
    });
  if (!narrow && width >= 640 && options.cpu && snapshots.some((snapshot) => snapshot.temperature !== null))
    columns.push({
      key: "temperature",
      label: t("temperature"),
      fraction: 0.85,
      render: (snapshot) => (
        <Text size="xs" className={classes.numeric}>
          {temperature(snapshot.temperature, options.fahrenheit)}
        </Text>
      ),
    });
  if (!narrow && width >= 800 && snapshots.some((snapshot) => snapshot.network !== null))
    columns.push({
      key: "network",
      label: t("network"),
      fraction: 1.2,
      render: (snapshot) => (
        <Stack gap={2} miw={0}>
          <Text size="xs" lh={1.1} truncate>
            ↓ {rate(snapshot.network?.down, formatByteRate)}
          </Text>
          <Text size="xs" lh={1.1} c="dimmed" truncate>
            ↑ {rate(snapshot.network?.up, formatByteRate)}
          </Text>
        </Stack>
      ),
    });
  let template = "minmax(0, 1.85fr)";
  for (const column of columns) template += " minmax(0," + column.fraction + "fr)";
  let filterVariant: "light" | "subtle" = "subtle";
  if (options.healthFilter === "attention") filterVariant = "light";

  return (
    <Stack h="100%" p={padding} gap={4} mih={0} miw={0} data-health-fleet data-layout="rows">
      <Group justify="space-between" gap="xs" wrap="nowrap" h={toolbarHeight} style={{ flexShrink: 0 }}>
        <Group gap={8} miw={0} wrap="nowrap">
          <Text size="sm" fw={600} truncate>
            {t("systemCount", { count: snapshots.length })}
          </Text>
          {attention > 0 && width >= 360 && (
            <Text size="xs" c="var(--health-warning)" truncate>
              {t("attentionCount", { count: attention })}
            </Text>
          )}
        </Group>
        <Group gap={4} wrap="nowrap">
          {(attention > 0 || options.healthFilter === "attention") && (
            <Tooltip label={t("filterSystems")} withArrow>
              <ActionIcon
                size={actionSize}
                variant={filterVariant}
                color="orange"
                aria-label={t("filterSystems")}
                aria-pressed={options.healthFilter === "attention"}
                disabled={isEditMode}
                onClick={() => {
                  let healthFilter: HealthOptions["healthFilter"] = "attention";
                  if (options.healthFilter === "attention") healthFilter = "all";
                  onPreferences({ healthFilter });
                  setPage(0);
                }}
              >
                <IconFilter style={zoomCompensatedSize(14)} />
              </ActionIcon>
            </Tooltip>
          )}
          {pages > 1 && (
            <>
              <Text size="xs" c="dimmed">
                {current + 1}/{pages}
              </Text>
              <ActionIcon
                size={actionSize}
                variant="subtle"
                color="gray"
                aria-label={t("previousPage")}
                disabled={current === 0 || isEditMode}
                onClick={() => setPage(current - 1)}
              >
                <IconChevronLeft style={zoomCompensatedSize(14)} />
              </ActionIcon>
              <ActionIcon
                size={actionSize}
                variant="subtle"
                color="gray"
                aria-label={t("nextPage")}
                disabled={current + 1 >= pages || isEditMode}
                onClick={() => setPage(current + 1)}
              >
                <IconChevronRight style={zoomCompensatedSize(14)} />
              </ActionIcon>
            </>
          )}
        </Group>
      </Group>
      {!narrow && (
        <Box
          display="grid"
          h={columnHeight}
          px={6}
          style={{ gridTemplateColumns: template, gap: "var(--mantine-spacing-sm)", flexShrink: 0 }}
          miw={0}
        >
          <Text size="xs" c="dimmed" lh={1.2}>
            {t("system")}
          </Text>
          {columns.map((column) => (
            <Text key={column.key} size="xs" c="dimmed" lh={1.2} truncate>
              {column.label}
            </Text>
          ))}
        </Box>
      )}
      <Box flex={1} mih={0} miw={0}>
        {visible.map((snapshot) => {
          let context: string = getIntegrationName(snapshot.system.kind);
          if (!snapshot.available) context += " · " + t("unavailable");
          else if (isStale(snapshot)) context += " · " + t("staleShort");
          else if (snapshot.alerts[0]) context += " · " + healthAlertLabel(snapshot.alerts[0], t);
          let stateColor = "teal";
          if (snapshot.alerts.length > 0) stateColor = "orange";
          if (!snapshot.available || isStale(snapshot)) stateColor = "gray";
          let stateLabel;
          if (!snapshot.available) stateLabel = t("unavailable");
          else if (isStale(snapshot)) stateLabel = t("staleShort");
          let uptimeLabel;
          if (options.showUptime && snapshot.system.health) uptimeLabel = uptime(snapshot.system.health.uptime, t);
          const source = (
            <Group gap={7} wrap="nowrap" miw={0}>
              <Box
                bg={stateColor}
                style={{ ...zoomCompensatedSize(5), flexShrink: 0, borderRadius: "50%" }}
                aria-hidden
              />
              <Stack gap={1} miw={0} flex={1}>
                <Group justify="space-between" gap={6} wrap="nowrap" miw={0}>
                  <Text size="sm" lh={1.2} fw={600} truncate>
                    {snapshot.system.name}
                  </Text>
                  {narrow && stateLabel && (
                    <Text size="xs" lh={1.1} c="dimmed" style={{ flexShrink: 0 }}>
                      {stateLabel}
                    </Text>
                  )}
                  {narrow && !stateLabel && uptimeLabel && rowHeight >= 64 && (
                    <Text size="xs" lh={1.1} c="dimmed" style={{ flexShrink: 0 }}>
                      {uptimeLabel}
                    </Text>
                  )}
                </Group>
                {(!narrow || rowHeight >= 64) && (
                  <Group gap={6} wrap="nowrap" miw={0}>
                    <Text size="xs" lh={1.1} c="dimmed" truncate flex={1} title={context}>
                      {context}
                    </Text>
                    {!narrow && uptimeLabel && (
                      <Text size="xs" lh={1.1} c="dimmed" style={{ flexShrink: 0 }}>
                        {uptimeLabel}
                      </Text>
                    )}
                  </Group>
                )}
              </Stack>
            </Group>
          );
          return (
            <UnstyledButton
              key={snapshot.system.id}
              w="100%"
              h={rowHeight}
              px={6}
              py={3}
              className={classes.fleetRow}
              data-selected={snapshot.system.id === options.selectedSystem || undefined}
              disabled={isEditMode}
              aria-label={t("inspectSystem", { name: snapshot.system.name })}
              title={context}
              onClick={(event) => {
                event.stopPropagation();
                onInspect(snapshot.system.id);
              }}
            >
              {!narrow && (
                <Box
                  display="grid"
                  h="100%"
                  miw={0}
                  style={{ gridTemplateColumns: template, alignItems: "center", gap: "var(--mantine-spacing-sm)" }}
                >
                  {source}
                  {columns.map((column) => (
                    <Box key={column.key} miw={0}>
                      {column.render(snapshot)}
                    </Box>
                  ))}
                </Box>
              )}
              {narrow && (
                <Stack gap={4} h="100%" justify="center" miw={0}>
                  {source}
                  {columns.length > 0 && (
                    <SimpleGrid cols={columns.length} spacing={8} miw={0}>
                      {columns.map((column) => (
                        <Box key={column.key} miw={0}>
                          {column.render(snapshot)}
                        </Box>
                      ))}
                    </SimpleGrid>
                  )}
                </Stack>
              )}
            </UnstyledButton>
          );
        })}
        {visible.length === 0 && (
          <Text size="sm" c="dimmed" p="sm">
            {t("noAttention")}
          </Text>
        )}
      </Box>
    </Stack>
  );
}

function Metric({
  label,
  value,
  color,
  inline,
  withBar,
  detail,
  title,
}: {
  label: string;
  value: number | null;
  color: string;
  inline: boolean;
  withBar: boolean;
  detail?: string;
  title?: string;
}) {
  return (
    <Stack gap={3} miw={0} title={title}>
      <Group gap={4} justify="space-between" wrap="nowrap" miw={0}>
        {inline && (
          <Text size="xs" lh={1.1} c="dimmed" truncate>
            {label}
          </Text>
        )}
        <Text size="sm" fw={600} lh={1.15} className={classes.numeric}>
          {percentage(value)}
        </Text>
      </Group>
      {withBar && value !== null && (
        <Progress value={value} size={2} color={pressureColor(value, color)} aria-label={label} />
      )}
      {detail && (
        <Text size="xs" lh={1.1} c="dimmed" truncate>
          {detail}
        </Text>
      )}
    </Stack>
  );
}

function rate(value: number | null | undefined, format: (value: number) => string) {
  if (value === null || value === undefined) return "—";
  return format(value);
}
