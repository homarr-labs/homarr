"use client";

import { useMemo } from "react";
import { AreaChart, ChartTooltip } from "@mantine/charts";
import { Stack, useMantineTheme } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { ReferenceLine, XAxis } from "recharts";

import { useRequiredBoard } from "@homarr/boards/context";
import type { SpeedtestTrackerResult } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { SectionLabel } from "./section-label";

interface XAxisTicks {
  midnightTs: number | null;
  xTicks: number[];
  topDateTicks: number[];
}

function buildXAxisTicks(data: { ts: number }[]): XAxisTicks {
  if (data.length === 0) return { midnightTs: null, xTicks: [], topDateTicks: [] };

  const first = data[0]?.ts ?? 0;
  const last = data.at(-1)?.ts ?? 0;

  const twoHourMs = 2 * 60 * 60 * 1000;
  const startTick = Math.ceil(first / twoHourMs) * twoHourMs;
  const tickSet = new Set<number>();
  for (let t = startTick; t <= last; t += twoHourMs) tickSet.add(t);

  const midnightDate = new Date(first);
  midnightDate.setHours(24, 0, 0, 0);
  const mTs = midnightDate.getTime();
  const foundMidnight = mTs > first && mTs < last ? mTs : null;
  if (foundMidnight) tickSet.add(foundMidnight);

  const topTicks: number[] = [first];
  if (foundMidnight) topTicks.push(foundMidnight);

  return {
    midnightTs: foundMidnight,
    xTicks: Array.from(tickSet).sort((tsA, tsB) => tsA - tsB),
    topDateTicks: topTicks,
  };
}

function makeXTickRenderer(midnightTs: number | null) {
  return ({ x, y, payload }: { x: number; y: number; payload: { value: number } }) => {
    const date = new Date(payload.value);
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isMidnight = midnightTs !== null && payload.value === midnightTs;
    const dateStr = isMidnight ? date.toLocaleDateString([], { month: "short", day: "numeric" }) : null;

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={12} textAnchor="middle" fontSize={10} fill="var(--mantine-color-dimmed)">
          {timeStr}
        </text>
        {dateStr && (
          <text x={0} y={23} textAnchor="middle" fontSize={9} fill="var(--mantine-color-dimmed)">
            {dateStr}
          </text>
        )}
      </g>
    );
  };
}

function renderTopDateTick(props: { x: number; y: number; payload: { value: number }; index: number }) {
  const { x, y, payload, index } = props;
  const date = new Date(payload.value);
  const dateStr = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const anchor = index === 0 ? "start" : "middle";
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={-4} textAnchor={anchor} fontSize={10} fill="var(--mantine-color-dimmed)">
        {dateStr}
      </text>
    </g>
  );
}

function buildYAxisConfig(maxVal: number, stepOptions: { threshold: number; step: number }[]) {
  const step = (stepOptions.find((opt) => maxVal <= opt.threshold) ?? stepOptions.at(-1))?.step ?? 1;
  const roundedMax = Math.ceil(maxVal / step) * step || step;
  const ticks: number[] = [];
  for (let val = 0; val <= roundedMax; val += step) ticks.push(val);
  return { ticks, domain: [0, roundedMax] as [number, number] };
}

function formatTooltipDate(label: number | string | undefined): string {
  const timestamp = typeof label === "number" ? label : Number(label);
  if (Number.isNaN(timestamp)) return "";
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecentResultsSection({
  results,
  showPingGraph,
}: {
  results: SpeedtestTrackerResult[];
  showPingGraph: boolean;
}) {
  const t = useScopedI18n("widget.speedtestTracker");

  return (
    <Stack gap={4} h="100%" style={{ minHeight: 0 }}>
      <SectionLabel>{t("recentResults")}</SectionLabel>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <SpeedSubChart results={results} showLabel={showPingGraph} />
        {showPingGraph && <PingSubChart results={results} />}
      </div>
    </Stack>
  );
}

function SpeedSubChart({ results, showLabel }: { results: SpeedtestTrackerResult[]; showLabel: boolean }) {
  const t = useScopedI18n("widget.speedtestTracker");
  const { ref, height } = useElementSize<HTMLDivElement>();

  return (
    <div style={{ flex: 2, minHeight: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      {showLabel && <SectionLabel>{t("recentResultsSpeed")}</SectionLabel>}
      <div ref={ref} style={{ flex: 1, minHeight: 0 }}>
        {height > 0 && <SpeedHistoryChart results={results} height={height} />}
      </div>
    </div>
  );
}

function PingSubChart({ results }: { results: SpeedtestTrackerResult[] }) {
  const t = useScopedI18n("widget.speedtestTracker");
  const { ref, height } = useElementSize<HTMLDivElement>();

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      <SectionLabel>{t("recentResultsPing")}</SectionLabel>
      <div ref={ref} style={{ flex: 1, minHeight: 0 }}>
        {height > 0 && <PingHistoryChart results={results} height={height} />}
      </div>
    </div>
  );
}

function SpeedHistoryChart({ results, height }: { results: SpeedtestTrackerResult[]; height: number }) {
  const board = useRequiredBoard();
  const theme = useMantineTheme();
  const t = useScopedI18n("widget.speedtestTracker");

  const data = useMemo(
    () =>
      [...results]
        .sort((resultA, resultB) => resultA.created_at.getTime() - resultB.created_at.getTime())
        .filter((result) => (result.download_bits ?? 0) > 0)
        .map((result) => ({
          ts: result.created_at.getTime(),
          Download: parseFloat(((result.download_bits ?? 0) / 1_000_000).toFixed(2)),
          Upload:
            result.upload_bits != null && result.upload_bits > 0
              ? parseFloat((result.upload_bits / 1_000_000).toFixed(2))
              : 0,
        })),
    [results],
  );

  const yConfig = useMemo(
    () =>
      buildYAxisConfig(Math.max(...data.map((item) => Math.max(item.Download, item.Upload)), 0), [
        { threshold: 400, step: 100 },
        { threshold: Infinity, step: 200 },
      ]),
    [data],
  );

  const { midnightTs, xTicks, topDateTicks } = useMemo(() => buildXAxisTicks(data), [data]);
  const renderXTick = useMemo(() => makeXTickRenderer(midnightTs), [midnightTs]);

  if (data.length === 0) return null;

  return (
    <AreaChart
      h={height}
      data={data}
      dataKey="ts"
      series={[
        { name: "Download", label: t("download"), color: "blue" },
        { name: "Upload", label: t("upload"), color: "teal" },
      ]}
      curveType="monotone"
      gridAxis="y"
      tickLine="none"
      withLegend
      fillOpacity={0.2}
      styles={{ root: { padding: 5, borderRadius: theme.radius[board.itemRadius] } }}
      valueFormatter={(val: number) => `${val} Mbps`}
      xAxisProps={{
        type: "number",
        domain: ["dataMin", "dataMax"],
        ticks: xTicks,
        tick: renderXTick,
        interval: 0,
        height: midnightTs !== null ? 38 : 28,
      }}
      yAxisProps={{
        ticks: yConfig.ticks,
        domain: yConfig.domain,
        tickFormatter: (val: number) => `${val}`,
        width: 50,
        tick: { fontSize: 10 },
      }}
      tooltipProps={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: (props: any) => {
          const { label, payload, active } = props as {
            label?: number | string;
            payload?: Record<string, unknown>[];
            active?: boolean;
          };
          if (!active || !payload?.length) return null;
          return (
            <ChartTooltip
              label={formatTooltipDate(label)}
              payload={payload}
              valueFormatter={(val: number) => `${val} Mbps`}
            />
          );
        },
      }}
    >
      <XAxis
        xAxisId="topDates"
        orientation="top"
        type="number"
        dataKey="ts"
        domain={["dataMin", "dataMax"]}
        ticks={topDateTicks}
        tick={renderTopDateTick}
        height={20}
        axisLine={false}
        tickLine={false}
        interval={0}
      />
      {xTicks.map((tickTs) => (
        <ReferenceLine
          key={tickTs}
          x={tickTs}
          yAxisId="left"
          stroke="var(--mantine-color-dimmed)"
          strokeDasharray="3 3"
          strokeOpacity={0.35}
        />
      ))}
    </AreaChart>
  );
}

function PingHistoryChart({ results, height }: { results: SpeedtestTrackerResult[]; height: number }) {
  const board = useRequiredBoard();
  const theme = useMantineTheme();
  const t = useScopedI18n("widget.speedtestTracker");

  const data = useMemo(
    () =>
      [...results]
        .sort((resultA, resultB) => resultA.created_at.getTime() - resultB.created_at.getTime())
        .map((result) =>
          result.ping === null
            ? null
            : {
                ts: result.created_at.getTime(),
                Ping: result.ping,
              },
        )
        .filter((result) => result !== null),
    [results],
  );

  const yConfig = useMemo(
    () =>
      buildYAxisConfig(Math.max(...data.map((item) => item.Ping), 0), [
        { threshold: 10, step: 2 },
        { threshold: 50, step: 10 },
        { threshold: 200, step: 50 },
        { threshold: Infinity, step: 100 },
      ]),
    [data],
  );

  const { midnightTs, xTicks } = useMemo(() => buildXAxisTicks(data), [data]);
  const renderXTick = useMemo(() => makeXTickRenderer(midnightTs), [midnightTs]);

  if (data.length === 0) return null;

  return (
    <AreaChart
      h={height}
      data={data}
      dataKey="ts"
      series={[{ name: "Ping", label: t("ping"), color: "orange" }]}
      curveType="monotone"
      gridAxis="y"
      tickLine="none"
      withLegend={false}
      fillOpacity={0.2}
      styles={{ root: { padding: 5, borderRadius: theme.radius[board.itemRadius] } }}
      valueFormatter={(val: number) => `${val} ms`}
      xAxisProps={{
        type: "number",
        domain: ["dataMin", "dataMax"],
        ticks: xTicks,
        tick: renderXTick,
        interval: 0,
        height: midnightTs !== null ? 38 : 28,
      }}
      yAxisProps={{
        ticks: yConfig.ticks,
        domain: yConfig.domain,
        tickFormatter: (val: number) => `${val}`,
        width: 50,
        tick: { fontSize: 10 },
      }}
      tooltipProps={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: (props: any) => {
          const { label, payload, active } = props as {
            label?: number | string;
            payload?: Record<string, unknown>[];
            active?: boolean;
          };
          if (!active || !payload?.length) return null;
          return (
            <ChartTooltip
              label={formatTooltipDate(label)}
              payload={payload}
              valueFormatter={(val: number) => `${val} ms`}
            />
          );
        },
      }}
    >
      {xTicks.map((tickTs) => (
        <ReferenceLine
          key={tickTs}
          x={tickTs}
          yAxisId="left"
          stroke="var(--mantine-color-dimmed)"
          strokeDasharray="3 3"
          strokeOpacity={0.35}
        />
      ))}
    </AreaChart>
  );
}
