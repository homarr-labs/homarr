"use client";

import { useState } from "react";
import { ActionIcon, Box, Group, Progress, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight, IconFilter } from "@tabler/icons-react";

import { getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import { useWidgetNow } from "../common/use-widget-now";
import { getHealthMetricOrder } from "./configuration";
import { isStaleReading, needsAttention, uptime } from "./display";
import type { HealthOptions } from "./display";
import { hasGlanceReading, useGlanceReadings } from "./glance-readings";
import type { HealthSystemSnapshot } from "./model";
import { SystemTile } from "./system-tile";
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

export function SystemFleet({ snapshots, width, height, options, isEditMode, onInspect, onPreferences }: FleetProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const glance = useGlanceReadings(options);
  const [page, setPage] = useState(0);
  const coarsePointer = useMediaQuery("(any-pointer: coarse)");
  const now = useWidgetNow()?.getTime();
  const isStale = (snapshot: HealthSystemSnapshot) =>
    isStaleReading(snapshot.system.updatedAt, now, snapshot.system.refreshInterval);
  const alerting = snapshots.filter((snapshot) => needsAttention(snapshot, now));
  const attentionOnly = options.healthFilter === "attention";
  const showFilter = alerting.length > 0 || attentionOnly;
  let filtered = snapshots;
  if (attentionOnly) filtered = alerting;

  const cards = options.presentation === "cards";
  const narrow = width < 560;
  const compact = options.density === "compact" || (options.density !== "comfortable" && height < 150);
  let padding = 8;
  if (compact) padding = 4;
  const innerWidth = Math.max(1, width - padding * 2);
  let targetSize = 28;
  if (coarsePointer) targetSize = 44;
  const showColumnLabels = !cards && !narrow && height >= 140;
  const headerHeight = showColumnLabels ? 22 : 0;
  const bodyHeight = Math.max(1, height - padding * 2 - targetSize - 4 - headerHeight);
  let rowHeight = 49;
  if (narrow) rowHeight = 70;
  if (narrow && bodyHeight < 240) rowHeight = 50;
  if (compact) rowHeight = narrow ? 48 : 36;
  if (options.density === "comfortable") rowHeight = narrow ? 84 : 62;
  if (coarsePointer) rowHeight = Math.max(44, rowHeight);

  let cardWidth = 245;
  let cardHeight = 138;
  if (compact) {
    cardWidth = 165;
    cardHeight = 94;
  }
  if (options.density === "comfortable") {
    cardWidth = 300;
    cardHeight = 174;
  }
  const cardColumns = Math.max(1, Math.min(filtered.length, Math.floor((innerWidth + 6) / (cardWidth + 6))));
  let pageSize = Math.max(1, Math.floor((bodyHeight + 4) / (rowHeight + 4)));
  if (cards) pageSize = cardColumns * Math.max(1, Math.floor((bodyHeight + 6) / (cardHeight + 6)));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * pageSize, (current + 1) * pageSize);
  const renderedRowHeight = Math.max(40, Math.min(rowHeight, bodyHeight));
  const cardRows = Math.max(1, Math.ceil(Math.min(filtered.length, pageSize) / cardColumns));
  const renderedCardHeight = Math.min(
    cardHeight,
    Math.max(74, Math.floor((bodyHeight - (cardRows - 1) * 6) / cardRows)),
  );
  const renderedCardWidth = Math.floor((innerWidth - (cardColumns - 1) * 6) / cardColumns);

  let metricSpace = innerWidth - 130;
  if (narrow) metricSpace = innerWidth;
  let metricWidth = 90;
  if (narrow) metricWidth = 108;
  const metricLimit = Math.max(1, Math.floor(metricSpace / metricWidth));
  const orderedMetrics = getHealthMetricOrder(options);
  const columns = orderedMetrics
    .filter((metric) => filtered.some((snapshot) => hasGlanceReading(snapshot, metric)))
    .slice(0, metricLimit);
  const template = "minmax(0, 1.5fr)" + " minmax(0, 1fr)".repeat(columns.length);
  const compactToolbar = showFilter && (innerWidth < 230 || (pages > 1 && innerWidth < 380));
  const showPageNumber = innerWidth >= 240;
  const singlePager = innerWidth < 230;

  return (
    <Stack
      h="100%"
      p={padding}
      gap={4}
      mih={0}
      miw={0}
      data-health-fleet
      data-layout={cards ? "cards" : "rows"}
      style={{ overflowY: "auto" }}
    >
      <Group gap={4} wrap="nowrap" mih={targetSize} style={{ flexShrink: 0 }}>
        {!compactToolbar && (
          <Text size="sm" fw={600} truncate>
            {t("systemCount", { count: snapshots.length })}
          </Text>
        )}
        {showFilter && (
          <HealthAttentionFilter
            count={alerting.length}
            active={attentionOnly}
            height={targetSize}
            disabled={isEditMode}
            onChange={(healthFilter) => {
              onPreferences({ healthFilter });
              setPage(0);
            }}
          />
        )}
        {pages > 1 && (
          <Group ml="auto" gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
            {showPageNumber && (
              <Text size="xs" c="dimmed">
                {current + 1}/{pages}
              </Text>
            )}
            {!singlePager && (
              <ActionIcon
                size={targetSize}
                variant="subtle"
                color="gray"
                aria-label={t("previousPage")}
                disabled={current === 0 || isEditMode}
                onClick={() => setPage(current - 1)}
              >
                <IconChevronLeft style={zoomCompensatedSize(16)} aria-hidden />
              </ActionIcon>
            )}
            <ActionIcon
              size={targetSize}
              variant="subtle"
              color="gray"
              aria-label={t("nextPage")}
              disabled={(!singlePager && current + 1 >= pages) || isEditMode}
              onClick={() => setPage((current + 1) % pages)}
            >
              <IconChevronRight style={zoomCompensatedSize(16)} aria-hidden />
            </ActionIcon>
          </Group>
        )}
      </Group>
      {showColumnLabels && (
        <Box
          display="grid"
          px={6}
          miw={0}
          style={{ gridTemplateColumns: template, gap: "var(--mantine-spacing-xs)", flexShrink: 0 }}
        >
          <Text size="xs" c="dimmed" lh={1.2}>
            {t("system")}
          </Text>
          {columns.map((metric) => (
            <Text key={metric} size="xs" c="dimmed" lh={1.2} truncate>
              {glance.label(metric)}
            </Text>
          ))}
        </Box>
      )}
      {visible.length === 0 && (
        <Text size="sm" c="dimmed" p={4}>
          {t("noAttention")}
        </Text>
      )}
      {cards && visible.length > 0 && (
        <SimpleGrid cols={cardColumns} spacing={6} verticalSpacing={6} miw={0}>
          {visible.map((snapshot) => (
            <Box key={snapshot.system.id} h={renderedCardHeight} miw={0}>
              <SystemTile
                snapshot={snapshot}
                width={renderedCardWidth}
                height={renderedCardHeight}
                options={options}
                isEditMode={isEditMode}
                stale={isStale(snapshot)}
                onInspect={() => onInspect(snapshot.system.id)}
              />
            </Box>
          ))}
        </SimpleGrid>
      )}
      {!cards &&
        visible.map((snapshot) => {
          const stale = isStale(snapshot);
          const status = glance.status(snapshot, stale);
          const provider = getIntegrationName(snapshot.system.kind);
          const details: string[] = [provider];
          if (
            options.showUptime &&
            snapshot.system.health &&
            snapshot.system.health.uptime !== null &&
            Number.isFinite(snapshot.system.health.uptime) &&
            snapshot.system.health.uptime >= 0
          )
            details.push(uptime(snapshot.system.health.uptime, t));
          const context = [status, ...details].filter(Boolean).join(" · ");
          const readings = columns.map((metric) => ({
            metric,
            label: glance.label(metric),
            reading: glance.read(snapshot, metric),
          }));
          const description = [
            context,
            ...readings.map(
              ({ label, reading }) => label + " " + (reading?.description ?? reading?.value ?? t("unknown")),
            ),
          ].join(", ");
          let stateColor = "teal";
          if (snapshot.alerts.length > 0) stateColor = "orange";
          if (!snapshot.available || stale) stateColor = "gray";
          const statusBelowName = narrow && width < 260 && Boolean(status);
          const identity = (
            <Group gap={6} wrap="nowrap" miw={0}>
              <Box
                bg={stateColor}
                style={{ ...zoomCompensatedSize(6), flexShrink: 0, borderRadius: "50%" }}
                aria-hidden
              />
              <Stack gap={1} miw={0} flex={1}>
                <Text size="sm" lh={1.15} fw={600} truncate>
                  {snapshot.system.name}
                </Text>
                {(!narrow || renderedRowHeight >= 60 || statusBelowName) && (
                  <Text size="xs" lh={1.1} c="dimmed" truncate>
                    {statusBelowName ? status : context}
                  </Text>
                )}
              </Stack>
              {narrow && renderedRowHeight < 60 && !statusBelowName && status && (
                <Text size="xs" lh={1.1} c="dimmed" maw="55%" truncate>
                  {status}
                </Text>
              )}
            </Group>
          );
          const cells = readings.map(({ metric, label, reading }) => (
            <Stack
              key={metric}
              gap={2}
              miw={0}
              title={[label, reading?.description ?? reading?.value ?? t("unknown"), reading?.context]
                .filter(Boolean)
                .join(" · ")}
            >
              <Group gap={3} wrap="nowrap" miw={0}>
                {(narrow || !showColumnLabels) && (
                  <Text size="xs" lh={1.1} c="dimmed" truncate>
                    {label}
                  </Text>
                )}
                <Text size="xs" fw={650} lh={1.2} className={classes.numeric} truncate>
                  {reading?.value ?? "—"}
                </Text>
              </Group>
              {renderedRowHeight >= 52 && reading?.percent !== undefined && (
                <Progress value={reading.percent} size={2} color={reading.color} aria-label={label} />
              )}
              {!narrow && renderedRowHeight >= 45 && reading?.context && (
                <Text size="xs" c="dimmed" lh={1.1} truncate>
                  {reading.context}
                </Text>
              )}
            </Stack>
          ));
          return (
            <UnstyledButton
              key={snapshot.system.id}
              w="100%"
              mih={renderedRowHeight}
              px={6}
              py={2}
              className={classes.fleetRow}
              data-selected={snapshot.system.id === options.selectedSystem || undefined}
              disabled={isEditMode}
              aria-label={t("inspectSystem", { name: snapshot.system.name })}
              aria-description={description}
              onClick={(event) => {
                event.stopPropagation();
                onInspect(snapshot.system.id);
              }}
            >
              {narrow ? (
                <Stack gap={3} justify="center" miw={0}>
                  {identity}
                  {columns.length > 0 && (
                    <SimpleGrid cols={columns.length} spacing={6}>
                      {cells}
                    </SimpleGrid>
                  )}
                </Stack>
              ) : (
                <Box
                  display="grid"
                  miw={0}
                  style={{ gridTemplateColumns: template, alignItems: "center", gap: "var(--mantine-spacing-xs)" }}
                >
                  {identity}
                  {cells}
                </Box>
              )}
            </UnstyledButton>
          );
        })}
    </Stack>
  );
}

export function HealthAttentionFilter({
  count,
  active,
  height,
  disabled,
  onChange,
}: {
  count: number;
  active: boolean;
  height: number;
  disabled: boolean;
  onChange: (filter: HealthOptions["healthFilter"]) => void;
}) {
  const t = useI18n("widget.healthMonitoring.rework");
  const label = t("attentionCount", { count });
  return (
    <UnstyledButton
      className={classes.attentionFilter}
      data-active={active || undefined}
      mih={height}
      miw={0}
      w="fit-content"
      maw="100%"
      px={5}
      disabled={disabled}
      aria-label={label}
      aria-description={t("filterSystems")}
      aria-pressed={active}
      onClick={() => onChange(active ? "all" : "attention")}
    >
      <Group gap={4} wrap="nowrap" miw={0}>
        <IconFilter style={{ ...zoomCompensatedSize(14), flexShrink: 0 }} aria-hidden />
        <Text size="xs" fw={600} truncate>
          {label}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
