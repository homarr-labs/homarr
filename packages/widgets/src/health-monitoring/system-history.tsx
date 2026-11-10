"use client";

import { useMemo, useState } from "react";
import { SegmentedControl, Select, Stack, Text } from "@mantine/core";

import { useByteFormatter } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { makeTooltipProps, MonitoringChartPanel, monitoringChartColors } from "../common/monitoring-chart";
import type { MonitoringAreaChartProps } from "../common/monitoring-chart";
import type { HealthOptions } from "./display";
import { finiteReading } from "./model";
import type { HealthSystemSnapshot } from "./model";

const percent = (value: number) => value.toFixed(1) + "%";

interface HistoryProps {
  snapshot: HealthSystemSnapshot;
  width: number;
  height: number;
  options: HealthOptions;
  mode?: "system" | "gpu";
  gpuId?: string;
}

interface Metric {
  title: string;
  label: string;
  key: string;
  series: MonitoringAreaChartProps["series"];
  format: (value: number) => string;
  maximum: number | string;
  current: number | null;
}

export function SystemHistory({ snapshot, width, height, options, mode = "system", gpuId }: HistoryProps) {
  const t = useI18n("widget.healthMonitoring.rework");
  const locale = useCurrentIntlLocale();
  const { formatBytes, formatByteRate } = useByteFormatter();
  const [selectedMetric, setSelectedMetric] = useState("");
  const { system } = snapshot;
  const data = useMemo(() => {
    let duration = 300_000;
    if (options.historyWindow === "15m") duration = 900_000;
    const cutoff = (system.history.at(-1)?.time ?? 0) - duration;
    const formatTime = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", second: "2-digit" });
    return system.history
      .filter((point) => point.time >= cutoff)
      .map((sample) => {
        const point: Record<string, number | string | null> = {
          time: formatTime.format(sample.time),
          rawTime: new Date(sample.time).toISOString(),
          cpu: sample.cpu,
          memory: sample.memory,
          download: sample.networkDown,
          upload: sample.networkUp,
          temperature: convertedTemperature(sample.temperature, options.fahrenheit),
        };
        for (const [id, gpu] of Object.entries(sample.gpu)) {
          point["gpu:" + id] = gpu.usage;
          point["gpuMemory:" + id] = gpu.memory;
          point["gpuTemperature:" + id] = convertedTemperature(gpu.temperature, options.fahrenheit);
        }
        return point;
      });
  }, [locale, options.fahrenheit, options.historyWindow, system.history]);

  const has = (key: string) => data.some((point) => typeof point[key] === "number");
  const degrees = (value: number) => {
    if (options.fahrenheit) return value.toFixed(1) + "°F";
    return value.toFixed(1) + "°C";
  };
  const metrics: Metric[] = [];
  if (mode === "system") {
    if (has("cpu") || snapshot.cpuPercent !== null)
      metrics.push({
        key: "cpu",
        title: t("cpu"),
        label: t("cpu"),
        series: [{ name: "cpu", label: t("cpu"), color: monitoringChartColors.cpu }],
        format: percent,
        maximum: 100,
        current: snapshot.cpuPercent,
      });
    if (has("memory") || snapshot.memory)
      metrics.push({
        key: "memory",
        title: t("memoryUsed"),
        label: t("memory"),
        series: [{ name: "memory", label: t("memoryUsed"), color: monitoringChartColors.memory }],
        format: formatBytes,
        maximum: snapshot.memory?.total ?? "auto",
        current: snapshot.memory?.used ?? null,
      });
    if (has("download") || has("upload") || snapshot.network)
      metrics.push({
        key: "network",
        title: t("network"),
        label: t("network"),
        series: [
          { name: "download", label: t("download"), color: monitoringChartColors.received },
          { name: "upload", label: t("upload"), color: monitoringChartColors.sent },
        ],
        format: formatByteRate,
        maximum: "auto",
        current: snapshot.network?.down ?? null,
      });
    if (has("temperature") || snapshot.temperature !== null)
      metrics.push({
        key: "temperature",
        title: t("cpuTemperature"),
        label: t("temperature"),
        series: [{ name: "temperature", label: t("cpuTemperature"), color: monitoringChartColors.write }],
        format: degrees,
        maximum: "auto",
        current: convertedTemperature(snapshot.temperature, options.fahrenheit),
      });
  } else {
    const gpu = system.health?.gpu.find((device) => device.gpuId === gpuId) ?? system.health?.gpu[0];
    if (gpu) {
      const candidates = [
        {
          prefix: "gpu:",
          title: t("gpuUsage"),
          current: finiteReading(gpu.processorUtilization),
          format: percent,
          maximum: 100,
        },
        {
          prefix: "gpuMemory:",
          title: t("gpuMemory"),
          current: finiteReading(gpu.memoryUtilization),
          format: percent,
          maximum: 100,
        },
        {
          prefix: "gpuTemperature:",
          title: t("gpuTemperature"),
          current: convertedTemperature(gpu.temperature, options.fahrenheit),
          format: degrees,
          maximum: "auto",
        },
      ];
      for (const candidate of candidates) {
        const key = candidate.prefix + gpu.gpuId;
        if (!has(key) && candidate.current === null) continue;
        metrics.push({
          ...candidate,
          key,
          label: candidate.title,
          series: [{ name: key, label: gpu.name, color: monitoringChartColors.disk }],
        });
      }
    }
  }
  const metric = metrics.find((entry) => entry.key === selectedMetric) ?? metrics[0];
  if (!metric)
    return (
      <Text size="xs" c="dimmed">
        {t("noMetrics")}
      </Text>
    );

  const controls = metrics.map((entry) => ({ value: entry.key, label: entry.label }));
  const observations = data.filter((point) =>
    metric.series.some((series) => typeof point[series.name] === "number"),
  ).length;
  let emptyMessage;
  if (observations < 2) emptyMessage = t("waitingHistory");
  let current;
  let currentText;
  if (metric.current !== null) {
    currentText = metric.format(metric.current);
    if (metric.key === "network") currentText = "↓ " + currentText;
    current = (
      <Text component="span" size="sm" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
        {currentText}
      </Text>
    );
  }

  // Selectors and panel headings have a fixed budget; the plot receives the rest.
  let controlsHeight = 0;
  if (metrics.length > 1) controlsHeight = 38;
  const plotHeight = Math.max(0, Math.floor(height - controlsHeight - 30));
  if (plotHeight < 48) {
    return (
      <Stack gap={4} miw={0}>
        <Text size="xs" c="dimmed">
          {metric.title}
        </Text>
        {current}
      </Stack>
    );
  }
  let selector;
  if (metrics.length > 1 && width >= 520)
    selector = (
      <SegmentedControl
        size="xs"
        fullWidth
        value={metric.key}
        onChange={setSelectedMetric}
        data={controls}
        aria-label={t("historyMetric")}
        transitionDuration={0}
      />
    );
  if (metrics.length > 1 && width < 520)
    selector = (
      <Select
        size="xs"
        value={metric.key}
        onChange={(value) => {
          if (value) setSelectedMetric(value);
        }}
        data={controls}
        aria-label={t("historyMetric")}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
    );

  return (
    <Stack h="100%" gap={8} miw={0} mih={0}>
      {selector}
      <MonitoringChartPanel
        key={metric.key}
        title={metric.title}
        value={current}
        emptyMessage={emptyMessage}
        chartProps={{
          data,
          h: plotHeight,
          series: metric.series,
          withXAxis: plotHeight >= 100,
          withLegend: metric.series.length > 1 && plotHeight >= 120,
          yAxisFormatter: metric.format,
          valueFormatter: metric.format,
          tooltipProps: makeTooltipProps(metric.format),
          yAxisDomain: [0, metric.maximum],
          fillOpacity: 0.14,
          areaChartProps: { syncId: "health:" + system.id, margin: { top: 8, right: 4, bottom: 0, left: 0 } },
        }}
      />
    </Stack>
  );
}

function convertedTemperature(value: number | null | undefined, fahrenheit: boolean) {
  const reading = finiteReading(value);
  if (reading === null) return null;
  if (fahrenheit) return reading * 1.8 + 32;
  return reading;
}
