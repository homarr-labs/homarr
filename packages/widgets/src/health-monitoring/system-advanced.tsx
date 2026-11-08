"use client";

import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Progress,
  SegmentedControl,
  Select,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { useByteFormatter } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { makeTooltipProps, MonitoringChartPanel, monitoringChartColors } from "../common/monitoring-chart";
import { MonitoringComparisonChart } from "../common/monitoring-comparison-chart";
import { useWidgetNow } from "../common/use-widget-now";
import { percentage, pressureColor, temperature } from "./display";
import type { HealthOptions } from "./display";
import { finiteReading } from "./model";
import type { HealthSample, HealthSystemSnapshot, HealthVolume } from "./model";
import classes from "./system-advanced.module.css";

type AnalysisView = "compare" | "history" | "storage";
type Sort = "configured" | "cpu" | "memory" | "attention";
type HistoryMetric = "cpu" | "memory" | "networkDown" | "networkUp" | "temperature";

export interface SystemAdvancedProps {
  snapshots: HealthSystemSnapshot[];
  width: number;
  height: number;
  options: HealthOptions;
  isEditMode: boolean;
  onPreferences: (options: Partial<HealthOptions>) => void;
  onInspect: (id: string) => void;
}

const palette = [
  monitoringChartColors.cpu,
  monitoringChartColors.memory,
  monitoringChartColors.disk,
  monitoringChartColors.write,
  monitoringChartColors.sent,
  monitoringChartColors.received,
];
const percent = (value: number) => value.toFixed(1) + "%";

export function SystemAdvanced(props: SystemAdvancedProps) {
  const { snapshots, width, height, options, isEditMode, onPreferences, onInspect } = props;
  const t = useI18n("widget.healthMonitoring.rework");
  const [view, setView] = useState<AnalysisView>("compare");
  const now = useWidgetNow()?.getTime();
  const { ref, height: bodyHeight } = useElementSize<HTMLDivElement>();
  const available = snapshots.filter((snapshot) => snapshot.available && !stale(snapshot, now)).length;
  const attention = snapshots.filter((snapshot) => needsAttention(snapshot, now)).length;
  const panelHeight = bodyHeight || Math.max(0, height - 84);
  const panelWidth = Math.max(0, width - 24);

  return (
    <Stack h="100%" mih={0} miw={0} p={12} gap={8} className={classes.workspace}>
      <Group justify="space-between" gap="xs" wrap="nowrap" pe={28}>
        <Text size="sm" fw={600}>
          {t("advancedReporting", { available, total: snapshots.length })}
        </Text>
        {attention > 0 && (
          <Badge size="sm" variant="light" color="orange" c="var(--mantine-color-text)">
            {t("attentionCount", { count: attention })}
          </Badge>
        )}
      </Group>
      <SegmentedControl
        size="xs"
        fullWidth
        value={view}
        onChange={(value) => {
          if (value === "compare" || value === "history" || value === "storage") setView(value);
        }}
        disabled={isEditMode}
        transitionDuration={0}
        aria-label={t("advancedViews")}
        data={[
          { value: "compare", label: t("advancedCompare") },
          { value: "history", label: t("advancedHistory") },
          { value: "storage", label: t("storage") },
        ]}
      />
      <Box ref={ref} flex={1} mih={0} miw={0}>
        {view === "compare" && (
          <Compare
            snapshots={snapshots}
            width={panelWidth}
            height={panelHeight}
            isEditMode={isEditMode}
            onInspect={onInspect}
            options={options}
            now={now}
          />
        )}
        {view === "history" && (
          <History
            snapshots={snapshots}
            width={panelWidth}
            height={panelHeight}
            options={options}
            isEditMode={isEditMode}
            onPreferences={onPreferences}
            onInspect={onInspect}
          />
        )}
        {view === "storage" && (
          <Storage
            snapshots={snapshots}
            width={panelWidth}
            height={panelHeight}
            options={options}
            isEditMode={isEditMode}
            onInspect={onInspect}
          />
        )}
      </Box>
    </Stack>
  );
}

function Compare({
  snapshots,
  width,
  height,
  isEditMode,
  onInspect,
  options,
  now,
}: Omit<SystemAdvancedProps, "onPreferences"> & { now?: number }) {
  const t = useI18n("widget.healthMonitoring.rework");
  const [sort, setSort] = useState<Sort>("configured");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [inspectId, setInspectId] = useState("");
  let ordered = snapshots;
  if (attentionOnly) ordered = ordered.filter((snapshot) => needsAttention(snapshot, now));
  if (sort === "cpu") ordered = ordered.toSorted((left, right) => (right.cpuPercent ?? -1) - (left.cpuPercent ?? -1));
  if (sort === "memory")
    ordered = ordered.toSorted((left, right) => (right.memory?.percent ?? -1) - (left.memory?.percent ?? -1));
  if (sort === "attention")
    ordered = ordered.toSorted((left, right) => Number(needsAttention(right, now)) - Number(needsAttention(left, now)));
  const graphHeight = Math.max(1, Math.floor(height - 76));
  let capacity = Math.max(1, Math.floor((height - 118) / 44));
  if (graphHeight < 140) capacity = Math.max(1, Math.floor(graphHeight / 38));
  const pages = Math.max(1, Math.ceil(ordered.length / capacity));
  const currentPage = Math.min(page, pages - 1);
  const visible = ordered.slice(currentPage * capacity, (currentPage + 1) * capacity);
  const chartData = visible.map((snapshot) => ({
    name: snapshot.system.name,
    cpu: snapshot.cpuPercent,
    memory: snapshot.memory?.percent ?? null,
  }));
  const series = [];
  if (options.cpu || snapshots.some((snapshot) => snapshot.cpuPercent !== null))
    series.push({ name: "cpu", label: t("cpu"), color: monitoringChartColors.cpu });
  if (options.memory || snapshots.some((snapshot) => snapshot.memory !== null))
    series.push({ name: "memory", label: t("memory"), color: monitoringChartColors.memory });
  const inspect = visible.find((snapshot) => snapshot.system.id === inspectId) ?? visible[0];
  let labelWidth = 140;
  let labelMaxLength = 22;
  if (width < 500) {
    labelWidth = 104;
    labelMaxLength = 15;
  }
  return (
    <Stack h="100%" gap={8} miw={0} mih={0}>
      <Group gap={8} justify="space-between" wrap="nowrap">
        <Select
          size="xs"
          w={170}
          miw={0}
          value={sort}
          onChange={(value) => {
            if (value === "configured" || value === "cpu" || value === "memory" || value === "attention") {
              setSort(value);
              setPage(0);
            }
          }}
          disabled={isEditMode}
          allowDeselect={false}
          aria-label={t("advancedSort")}
          data={[
            { value: "configured", label: t("advancedConfigured") },
            { value: "cpu", label: t("cpu") },
            { value: "memory", label: t("memory") },
            { value: "attention", label: t("attention") },
          ]}
        />
        <Button
          size="compact-xs"
          variant={attentionOnly ? "light" : "subtle"}
          color="orange"
          c="var(--mantine-color-text)"
          disabled={isEditMode}
          onClick={() => {
            setAttentionOnly((value) => !value);
            setPage(0);
          }}
          aria-pressed={attentionOnly}
        >
          {t("attention")}
        </Button>
      </Group>
      {visible.length > 0 && (
        <MonitoringComparisonChart
          h={graphHeight}
          data={chartData}
          series={series}
          withBarValueLabel={width >= 600}
          labelWidth={labelWidth}
          labelMaxLength={labelMaxLength}
          disabled={isEditMode}
          onSelect={(index) => {
            const snapshot = visible[index];
            if (snapshot) onInspect(snapshot.system.id);
          }}
        />
      )}
      {visible.length === 0 && (
        <Text size="sm" c="dimmed" py="md" flex={1}>
          {t("noAttention")}
        </Text>
      )}
      <Group gap={8} wrap="nowrap" justify="space-between">
        <Select
          size="xs"
          flex={1}
          miw={0}
          value={inspect?.system.id ?? null}
          data={visible.map((snapshot) => ({ value: snapshot.system.id, label: snapshot.system.name }))}
          onChange={(value) => {
            if (value) setInspectId(value);
          }}
          disabled={isEditMode}
          allowDeselect={false}
          aria-label={t("advancedInspect")}
        />
        <Button
          size="compact-xs"
          variant="light"
          c="var(--mantine-color-text)"
          disabled={isEditMode || !inspect}
          onClick={() => {
            if (inspect) onInspect(inspect.system.id);
          }}
        >
          {t("details")}
        </Button>
        <Pager page={currentPage} pages={pages} onChange={setPage} disabled={isEditMode} />
      </Group>
    </Stack>
  );
}

function History({ snapshots, width, height, options, isEditMode, onPreferences, onInspect }: SystemAdvancedProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const locale = useCurrentIntlLocale();
  const { formatBytes, formatByteRate } = useByteFormatter();
  const [metric, setMetric] = useState<HistoryMetric>("cpu");
  const [page, setPage] = useState(0);
  const metrics: { value: HistoryMetric; label: string }[] = [];
  if (
    snapshots.some(
      (snapshot) => snapshot.cpuPercent !== null || snapshot.system.history.some((sample) => sample.cpu !== null),
    )
  )
    metrics.push({ value: "cpu", label: t("cpu") });
  if (
    snapshots.some(
      (snapshot) => snapshot.memory !== null || snapshot.system.history.some((sample) => sample.memory !== null),
    )
  )
    metrics.push({ value: "memory", label: t("memoryUsed") });
  if (
    snapshots.some(
      (snapshot) =>
        (snapshot.network?.down !== null && snapshot.network?.down !== undefined) ||
        snapshot.system.history.some((sample) => sample.networkDown !== null),
    )
  )
    metrics.push({ value: "networkDown", label: t("download") });
  if (
    snapshots.some(
      (snapshot) =>
        (snapshot.network?.up !== null && snapshot.network?.up !== undefined) ||
        snapshot.system.history.some((sample) => sample.networkUp !== null),
    )
  )
    metrics.push({ value: "networkUp", label: t("upload") });
  if (
    snapshots.some(
      (snapshot) =>
        snapshot.temperature !== null || snapshot.system.history.some((sample) => sample.temperature !== null),
    )
  )
    metrics.push({ value: "temperature", label: t("temperature") });
  let selectedMetric = metric;
  if (!metrics.some((entry) => entry.value === metric)) selectedMetric = metrics[0]?.value ?? "cpu";
  const eligible = snapshots.filter(
    (snapshot) =>
      snapshot.system.history.some((sample) => sample[selectedMetric] !== null) ||
      currentReading(snapshot, selectedMetric) !== null,
  );
  let capacity = 6;
  if (width < 500) capacity = 4;
  const pages = Math.max(1, Math.ceil(eligible.length / capacity));
  const currentPage = Math.min(page, pages - 1);
  const visible = eligible.slice(currentPage * capacity, (currentPage + 1) * capacity);
  const chartData = useMemo(
    () => comparisonHistory(visible, selectedMetric, options.historyWindow, options.fahrenheit, locale),
    [visible, selectedMetric, options.historyWindow, options.fahrenheit, locale],
  );
  let formatter = percent;
  if (selectedMetric === "memory") formatter = formatBytes;
  if (selectedMetric === "networkDown" || selectedMetric === "networkUp") formatter = formatByteRate;
  if (selectedMetric === "temperature")
    formatter = (value: number) => {
      if (options.fahrenheit) return value.toFixed(1) + "°F";
      return value.toFixed(1) + "°C";
    };
  let maximum: number | string = "auto";
  if (selectedMetric === "cpu") maximum = 100;
  const series = visible.map((snapshot) => ({
    name: snapshot.system.id,
    label: snapshot.system.name,
    color: palette[Math.max(0, snapshots.indexOf(snapshot)) % palette.length] ?? monitoringChartColors.cpu,
  }));
  let emptyMessage;
  if (chartData.length < 2 || !chartData.some((point) => series.some((entry) => typeof point[entry.name] === "number")))
    emptyMessage = t("advancedNoHistory");
  const plotHeight = Math.max(48, Math.floor(height - 132));
  return (
    <Stack h="100%" gap={8} miw={0} mih={0}>
      <Group justify="space-between" gap={8} wrap="nowrap">
        <Select
          size="xs"
          value={selectedMetric}
          onChange={(value) => {
            if (
              value === "cpu" ||
              value === "memory" ||
              value === "networkDown" ||
              value === "networkUp" ||
              value === "temperature"
            ) {
              setMetric(value);
              setPage(0);
            }
          }}
          data={metrics}
          disabled={isEditMode}
          allowDeselect={false}
          aria-label={t("historyMetric")}
          miw={0}
          flex={1}
          maw={210}
        />
        <SegmentedControl
          size="xs"
          transitionDuration={0}
          value={options.historyWindow}
          disabled={isEditMode}
          aria-label={t("historyWindow")}
          onChange={(value) => {
            if (value === "5m" || value === "15m") onPreferences({ historyWindow: value });
          }}
          data={[
            { value: "5m", label: t("history5m") },
            { value: "15m", label: t("history15m") },
          ]}
        />
      </Group>
      <MonitoringChartPanel
        title={metrics.find((entry) => entry.value === selectedMetric)?.label ?? t("advancedHistory")}
        emptyMessage={emptyMessage}
        chartProps={{
          data: chartData,
          h: plotHeight,
          series,
          withXAxis: plotHeight >= 100,
          withLegend: false,
          yAxisFormatter: formatter,
          valueFormatter: formatter,
          tooltipProps: makeTooltipProps(formatter),
          yAxisDomain: [0, maximum],
          fillOpacity: 0.02,
          strokeWidth: 1.5,
          areaChartProps: { margin: { left: 0, right: 4, top: 8, bottom: 0 } },
        }}
      />
      <Group gap={6} wrap="nowrap" justify="space-between">
        <Group gap={6} wrap="wrap" miw={0}>
          {visible.map((snapshot, index) => (
            <UnstyledButton
              key={snapshot.system.id}
              disabled={isEditMode}
              onClick={() => onInspect(snapshot.system.id)}
              className={classes.legendButton}
              title={snapshot.system.name}
            >
              <Box w={6} h={6} bg={series[index]?.color} style={{ borderRadius: "50%", flexShrink: 0 }} />
              <Text size="xs" truncate>
                {snapshot.system.name}
              </Text>
            </UnstyledButton>
          ))}
        </Group>
        <Pager page={currentPage} pages={pages} onChange={setPage} disabled={isEditMode} />
      </Group>
    </Stack>
  );
}

function Storage({
  snapshots,
  width,
  height,
  options,
  isEditMode,
  onInspect,
}: Omit<SystemAdvancedProps, "onPreferences">) {
  const t = useI18n("widget.healthMonitoring.rework");
  const { formatBytes } = useByteFormatter();
  const [page, setPage] = useState(0);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const all = snapshots
    .flatMap((snapshot) => snapshot.volumes.map((volume) => ({ snapshot, volume })))
    .toSorted((left, right) => {
      const healthDifference = Number(right.volume.health === "attention") - Number(left.volume.health === "attention");
      if (healthDifference !== 0) return healthDifference;
      return (right.volume.percent ?? -1) - (left.volume.percent ?? -1);
    });
  let rows = all;
  if (attentionOnly) rows = rows.filter(({ volume }) => volume.health === "attention" || (volume.percent ?? 0) >= 90);
  let rowHeight = 62;
  if (width < 500) rowHeight = 76;
  const capacity = Math.max(1, Math.floor((height - 70) / rowHeight));
  const pages = Math.max(1, Math.ceil(rows.length / capacity));
  const currentPage = Math.min(page, pages - 1);
  const visible = rows.slice(currentPage * capacity, (currentPage + 1) * capacity);
  return (
    <Stack h="100%" gap={8} miw={0} mih={0}>
      <Group justify="space-between" wrap="nowrap" gap={8}>
        <Text size="xs" c="dimmed">
          {t("advancedVolumes", {
            count: all.length,
            sources: snapshots.filter((snapshot) => snapshot.volumes.length > 0).length,
          })}
        </Text>
        <Button
          size="compact-xs"
          variant={attentionOnly ? "light" : "subtle"}
          color="orange"
          c="var(--mantine-color-text)"
          disabled={isEditMode}
          onClick={() => {
            setAttentionOnly((value) => !value);
            setPage(0);
          }}
          aria-pressed={attentionOnly}
        >
          {t("attention")}
        </Button>
      </Group>
      <Stack gap={0} flex={1} mih={0}>
        {visible.map(({ snapshot, volume }) => (
          <UnstyledButton
            key={snapshot.system.id + ":" + volume.id}
            onClick={() => onInspect(snapshot.system.id)}
            disabled={isEditMode}
            className={classes.storageRow}
            style={{ minHeight: rowHeight }}
          >
            <Stack gap={2} miw={0}>
              <Text size="xs" fw={600} truncate>
                {volume.name}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {snapshot.system.name}
              </Text>
              {width < 500 && (
                <Text size="xs" c={verdictColor(volume)}>
                  {verdictLabel(volume, t)}
                </Text>
              )}
            </Stack>
            <Stack gap={4} miw={0}>
              <Group justify="space-between" wrap="nowrap" gap={4}>
                <Text size="xs" fw={600}>
                  {percentage(volume.percent)}
                </Text>
                {freeSpaceLabel(volume, formatBytes) && (
                  <Text size="xs" c="dimmed">
                    {t("freeSpace", { value: freeSpaceLabel(volume, formatBytes) })}
                  </Text>
                )}
              </Group>
              {volume.percent !== null && (
                <Progress
                  size={4}
                  value={volume.percent}
                  color={pressureColor(volume.percent, "teal")}
                  aria-label={snapshot.system.name + " " + volume.name}
                />
              )}
              {volume.percent === null && (
                <Text size="xs" c="dimmed">
                  {t("capacityUnknown")}
                </Text>
              )}
            </Stack>
            {width >= 500 && (
              <Stack gap={2} align="flex-end">
                <Text size="xs" c={verdictColor(volume)}>
                  {verdictLabel(volume, t)}
                </Text>
                {volume.temperature !== null && (
                  <Text size="xs" c="dimmed">
                    {temperature(volume.temperature, options.fahrenheit)}
                  </Text>
                )}
              </Stack>
            )}
          </UnstyledButton>
        ))}
        {visible.length === 0 && (
          <Text size="sm" c="dimmed" py="md">
            {t("advancedNoStorage")}
          </Text>
        )}
      </Stack>
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="xs" c="dimmed">
          {t("pageRange", {
            first: Math.min(rows.length, currentPage * capacity + 1),
            last: Math.min(rows.length, (currentPage + 1) * capacity),
            total: rows.length,
          })}
        </Text>
        <Pager page={currentPage} pages={pages} onChange={setPage} disabled={isEditMode} />
      </Group>
    </Stack>
  );
}

function Pager({
  page,
  pages,
  onChange,
  disabled,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  disabled: boolean;
}) {
  const t = useI18n("widget.healthMonitoring.rework");
  if (pages <= 1) return null;
  return (
    <Group gap={4} wrap="nowrap">
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        disabled={disabled || page === 0}
        onClick={() => onChange(page - 1)}
        aria-label={t("previousPage")}
      >
        <IconChevronLeft size={14} />
      </ActionIcon>
      <Text size="xs" c="dimmed">
        {page + 1}/{pages}
      </Text>
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        disabled={disabled || page + 1 >= pages}
        onClick={() => onChange(page + 1)}
        aria-label={t("nextPage")}
      >
        <IconChevronRight size={14} />
      </ActionIcon>
    </Group>
  );
}

function needsAttention(snapshot: HealthSystemSnapshot, now?: number) {
  return !snapshot.available || snapshot.alerts.length > 0 || stale(snapshot, now);
}

function stale(snapshot: HealthSystemSnapshot, now?: number) {
  if (now === undefined || snapshot.system.updatedAt === undefined) return false;
  return now - snapshot.system.updatedAt > 60_000;
}

function currentReading(snapshot: HealthSystemSnapshot, metric: HistoryMetric) {
  if (metric === "cpu") return snapshot.cpuPercent;
  if (metric === "memory") return snapshot.memory?.used ?? null;
  if (metric === "networkDown") return snapshot.network?.down ?? null;
  if (metric === "networkUp") return snapshot.network?.up ?? null;
  return snapshot.temperature;
}

function comparisonHistory(
  snapshots: HealthSystemSnapshot[],
  metric: HistoryMetric,
  historyWindow: HealthOptions["historyWindow"],
  fahrenheit: boolean,
  locale: string,
) {
  const lastTime = Math.max(
    0,
    ...snapshots.flatMap((snapshot) => snapshot.system.history.map((sample) => sample.time)),
  );
  let duration = 300_000;
  if (historyWindow === "15m") duration = 900_000;
  const cutoff = lastTime - duration;
  const points = new Map<number, Record<string, number | string | null>>();
  const formatter = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  const pointAt = (time: number) => {
    let point = points.get(time);
    if (!point) {
      point = { time: formatter.format(time), rawTime: new Date(time).toISOString() };
      for (const snapshot of snapshots) point[snapshot.system.id] = null;
      points.set(time, point);
    }
    return point;
  };
  for (const snapshot of snapshots) {
    let previous: HealthSample | undefined;
    for (const sample of snapshot.system.history) {
      if (!Number.isFinite(sample.time) || sample.time < cutoff) continue;
      if (previous && sample.time - previous.time > 30_000)
        pointAt(Math.floor(previous.time / 10_000) * 10_000 + 10_000);
      previous = sample;
      const time = Math.floor(sample.time / 10_000) * 10_000;
      let value = finiteReading(sample[metric]);
      if (metric === "temperature" && value !== null && fahrenheit) value = value * 1.8 + 32;
      // A slot holds its latest real observation, never an average or carried value.
      pointAt(time)[snapshot.system.id] = value;
    }
  }
  return [...points.entries()].toSorted(([leftTime], [rightTime]) => leftTime - rightTime).map(([, point]) => point);
}

function verdictColor(volume: HealthVolume) {
  if (volume.health === "attention") return "var(--health-warning)";
  if (volume.health === "healthy") return "var(--health-success)";
  return "dimmed";
}

function freeSpaceLabel(volume: HealthVolume, format: (value: number) => string) {
  if (volume.free !== null) return format(volume.free);
  return volume.fileSystem?.available.trim() ?? "";
}

function verdictLabel(volume: HealthVolume, t: ReturnType<typeof useI18n<"widget.healthMonitoring.rework">>) {
  if (volume.health === "attention") return t("attention");
  if (volume.health === "healthy") return t("healthy");
  return t("unknown");
}
