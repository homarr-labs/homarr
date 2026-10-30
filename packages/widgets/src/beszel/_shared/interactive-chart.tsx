"use client";
import { memo, useMemo } from "react";
import { AreaChart } from "@mantine/charts";
import type { AreaChartProps } from "@mantine/charts";
import classes from "./chart.module.css";
import { chartStyle } from "./chart-style";

const yAxisBase = {
  tickMargin: 0,
  tick: { fontSize: 12, fill: "var(--beszel-chart-muted)" },
} as const;
const chartMargin = { top: 12, right: 5, bottom: 0, left: 0 } as const;

export type BeszelAreaChartProps = Omit<AreaChartProps, "dataKey" | "curveType" | "withDots" | "withYAxis"> & {
  yAxisFormatter: (value: number) => string;
  yAxisDomain?: [number, string];
};

const BeszelAreaChart = memo(
  ({
    yAxisFormatter,
    withXAxis = true,
    yAxisDomain,
    yAxisProps: yAxisPropsOverride,
    xAxisProps: xAxisPropsOverride,
    areaChartProps: areaChartPropsOverride,
    type = "default",
    fillOpacity = 0.4,
    ...props
  }: BeszelAreaChartProps) => {
    const mergedXAxis = useMemo(
      () => ({
        interval: "preserveEnd" as const,
        minTickGap: 50,
        tick: { fontSize: 12, fill: "var(--beszel-chart-muted)" },
        ...xAxisPropsOverride,
      }),
      [xAxisPropsOverride],
    );
    const mergedYAxis = useMemo(() => {
      const base = {
        ...yAxisBase,
        width: "auto" as const,
        tickMargin: 2,
        tickFormatter: yAxisFormatter,
        ...yAxisPropsOverride,
      };
      if (yAxisDomain) {
        return { ...base, domain: yAxisDomain };
      }
      return base;
    }, [yAxisFormatter, yAxisDomain, yAxisPropsOverride]);

    return (
      <AreaChart
        // Recharts keeps registration order when keyed areas move; reset it when ranks change.
        key={JSON.stringify(props.series.map(({ name }) => name))}
        className={classes.chart}
        dataKey="time"
        curveType="monotone"
        withGradient={false}
        connectNulls={false}
        withDots={false}
        areaProps={({ color }) => ({
          fill: color,
          fillOpacity,
          activeDot: { r: 4, fill: color, stroke: "transparent", strokeWidth: 2 },
        })}
        type={type}
        strokeWidth={1}
        fillOpacity={fillOpacity}
        strokeDasharray="0"
        gridColor="color-mix(in srgb, var(--beszel-chart-border) 50%, transparent)"
        textColor="var(--beszel-chart-muted)"
        withXAxis={withXAxis}
        withYAxis
        w="100%"
        areaChartProps={{ margin: chartMargin, ...areaChartPropsOverride }}
        style={chartStyle}
        xAxisProps={mergedXAxis}
        yAxisProps={mergedYAxis}
        {...props}
      />
    );
  },
);

export default BeszelAreaChart;
