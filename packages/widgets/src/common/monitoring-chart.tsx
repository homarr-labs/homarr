"use client";

import { createContext, memo, useContext, useDeferredValue, useEffect, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import type { AreaChartProps } from "@mantine/charts";
import { Box, Group, Stack, Text } from "@mantine/core";
import { useInViewport } from "@mantine/hooks";

import { WidgetQueryLoadingState } from "./query-state-indicator";
import type { MonitoringAreaChartProps } from "./monitoring-area-chart";
import classes from "./monitoring-chart.module.css";
import { chartStyle } from "./monitoring-chart-style";

export type { MonitoringAreaChartProps } from "./monitoring-area-chart";
export { makeTooltipProps } from "./monitoring-chart-tooltip";
export { chartStyle } from "./monitoring-chart-style";
export { monitoringChartColors } from "./monitoring-chart-colors";

const ChartHeightContext = createContext<AreaChartProps["h"]>(180);

function LoadingChart() {
  return <MonitoringChartPlaceholder height={useContext(ChartHeightContext)} />;
}

const MonitoringAreaChart = dynamic(() => import("./monitoring-area-chart"), {
  ssr: false,
  loading: LoadingChart,
});

const panelStyle = { minWidth: 0 } as const;
const chartContainerStyle = {
  minWidth: 0,
  minHeight: 1,
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  flexShrink: 0,
} as const;

interface MonitoringChartPanelProps {
  title: string;
  subtitle?: string;
  value?: ReactNode;
  emptyMessage?: string;
  chartProps: MonitoringAreaChartProps;
}

export const MonitoringChartPanel = memo(
  ({ title, subtitle, value, emptyMessage, chartProps }: MonitoringChartPanelProps) => {
    const { ref, inViewport } = useInViewport<HTMLDivElement>();
    const [hasBeenVisible, setHasBeenVisible] = useState(false);
    const isVisible = inViewport || typeof IntersectionObserver === "undefined";

    useEffect(() => {
      if (isVisible) setHasBeenVisible(true);
    }, [isVisible]);

    return (
      <Stack gap={4} style={panelStyle}>
        <Group gap="xs" wrap="nowrap" justify="space-between" align="baseline">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} style={{ flexShrink: 0 }}>
              {title}
            </Text>
            {subtitle && (
              <Text size="xs" c="dimmed" truncate style={{ minWidth: 0 }}>
                {subtitle}
              </Text>
            )}
          </Group>
          {value !== undefined && (
            <Text component="div" size="sm" fw={600} style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {value}
            </Text>
          )}
        </Group>
        <Box ref={ref} style={chartContainerStyle}>
          {emptyMessage && (
            <Box h={chartProps.h} style={{ display: "flex", alignItems: "center" }}>
              <Text size="xs" c="dimmed">
                {emptyMessage}
              </Text>
            </Box>
          )}
          {!emptyMessage && (inViewport || hasBeenVisible) && (
            <DeferredMonitoringChart chartProps={chartProps} isVisible={isVisible} />
          )}
          {!emptyMessage && !inViewport && !hasBeenVisible && <MonitoringChartPlaceholder height={chartProps.h} />}
        </Box>
      </Stack>
    );
  },
);

const MonitoringChartPlaceholder = ({ height }: { height: AreaChartProps["h"] }) => (
  <Box h={height} className={classes.chart} style={chartStyle}>
    <WidgetQueryLoadingState />
  </Box>
);

const DeferredMonitoringChart = memo(
  ({ chartProps }: { chartProps: MonitoringAreaChartProps; isVisible: boolean }) => {
    // Render the first visible chart promptly; defer subsequent data updates.
    const deferredChartProps = useDeferredValue(chartProps);
    return (
      <ChartHeightContext.Provider value={deferredChartProps.h}>
        <MonitoringAreaChart {...deferredChartProps} />
      </ChartHeightContext.Provider>
    );
  },
  // Retain mounted charts while offscreen; apply the latest data when they re-enter view.
  (previous, next) => !next.isVisible || previous.chartProps === next.chartProps,
);
