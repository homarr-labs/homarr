"use client";

import { BarChart } from "@mantine/charts";
import type { BarChartProps } from "@mantine/charts";
import { Box, Group, Progress, Stack, Text, UnstyledButton } from "@mantine/core";

import classes from "./monitoring-chart.module.css";

type MonitoringComparisonChartProps = Pick<BarChartProps, "data" | "h" | "series" | "withBarValueLabel"> & {
  labelWidth: number;
  labelMaxLength: number;
  disabled: boolean;
  onSelect: (index: number) => void;
};

const formatPercent = (value: number) => value.toFixed(1) + "%";

export function MonitoringComparisonChart({
  labelWidth,
  labelMaxLength,
  disabled,
  onSelect,
  ...props
}: MonitoringComparisonChartProps) {
  // Short landscape panels need space for the readings instead of chart chrome.
  if (typeof props.h === "number" && props.h < 140) {
    return (
      <Stack h={props.h} gap={4} miw={0}>
        {props.data.map((reading, index) => (
          <UnstyledButton
            key={index}
            disabled={disabled}
            onClick={() => onSelect(index)}
            flex={1}
            miw={0}
            style={{
              display: "grid",
              alignItems: "center",
              columnGap: "var(--mantine-spacing-md)",
              gridTemplateColumns: "minmax(0, 1.4fr) repeat(" + props.series.length + ", minmax(0, 1fr))",
            }}
          >
            <Text size="xs" fw={600} truncate title={String(reading.name)}>
              {reading.name}
            </Text>
            {props.series.map((series) => {
              const value: unknown = reading[series.name];
              let label = "—";
              let percentage: number | null = null;
              if (typeof value === "number" && Number.isFinite(value)) {
                label = formatPercent(value);
                percentage = Math.max(0, Math.min(100, value));
              }
              return (
                <Stack key={series.name} gap={4} miw={0}>
                  <Group gap={4} justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed" truncate>
                      {series.label ?? series.name}
                    </Text>
                    <Text size="xs" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                      {label}
                    </Text>
                  </Group>
                  {percentage !== null && <Progress size={4} value={percentage} color={series.color} aria-hidden />}
                  {percentage === null && <Box h={4} />}
                </Stack>
              );
            })}
          </UnstyledButton>
        ))}
      </Stack>
    );
  }
  return (
    <BarChart
      {...props}
      dataKey="name"
      orientation="vertical"
      withLegend
      maxBarWidth={12}
      fillOpacity={0.85}
      className={classes.comparisonChart}
      valueFormatter={formatPercent}
      valueLabelProps={{ position: "right", fontSize: 11, fill: "var(--mantine-color-text)" }}
      xAxisProps={{
        domain: [0, 100],
        tickFormatter: formatPercent,
        tick: { fontSize: 11, fill: "var(--mantine-color-dimmed)" },
      }}
      yAxisProps={{
        width: labelWidth,
        tick: { fontSize: 11, fill: "var(--mantine-color-dimmed)" },
        tickFormatter: (value: string) => {
          if (value.length > labelMaxLength) return value.slice(0, labelMaxLength - 1) + "…";
          return value;
        },
      }}
      textColor="var(--mantine-color-dimmed)"
      gridColor="var(--mantine-color-default-border)"
      gridAxis="x"
      tickLine="none"
      barChartProps={{
        margin: { left: 0, right: 32, top: 0, bottom: 0 },
        onClick: (state) => {
          if (disabled || state.activeTooltipIndex === undefined || state.activeTooltipIndex === null) return;
          const index = Number(state.activeTooltipIndex);
          if (Number.isInteger(index) && index >= 0 && index < props.data.length) onSelect(index);
        },
      }}
    />
  );
}
