"use client";

import { useMemo } from "react";
import { AreaChart, ChartTooltip } from "@mantine/charts";
import { Stack, useMantineTheme } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { ReferenceLine, XAxis } from "recharts";

import { useRequiredBoard } from "@homarr/boards/context";
import type { SpeedtestTrackerResult } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { parseTimestamp } from "./helpers";
import { SectionLabel } from "./section-label";

// ── Shared X-axis utilities (module-level, pure) ──────────────────────────────

interface XAxisTicks {
  midnightTs: number | null;
  xTicks: number[];
  topDateTicks: number[];
}

function buildXAxisTicks(data: { ts: number }[]): XAxisTicks {
  if (data.length === 0) return { midnightTs: null, xTicks: [], topDateTicks: [] };

  const first = data[0]?.ts ?? 0;
  const last = data.at(-1)?.ts ?? 0;

  // 2-hour interval ticks aligned to wall-clock hours
  const twoHourMs = 2 * 60 * 60 * 1000;
  const startTick = Math.ceil(first / twoHourMs) * twoHourMs;
  const tickSet = new Set<number>();
  for (let t = startTick; t <= last; t += twoHourMs) tickSet.add(t);

  // Find local midnight within the data window
  const midnightDate = new Date(first);
  midnightDate.setHours(24, 0, 0, 0);
  const mTs = midnightDate.getTime();
  const foundMidnight = mTs > first && mTs < last ? mTs : null;
  if (foundMidnight) tickSet.add(foundMidnight);

  // Top date axis: first data point + any midnight boundaries
  const topTicks: number[] = [first];
  if (foundMidnight) topTicks.push(foundMidnight);

  return {
    midnightTs: foundMidnight,
    xTicks: Array.from(tickSet).sort((tsA, tsB) => tsA - tsB),
    topDateTicks: topTicks,
  };
}

// Returns a recharts tick renderer for the bottom X axis. Midnight ticks show
// two lines (time + date); all other ticks show time only.
function makeXTickRenderer(midnightTs: number | null) {
  return ({ x, y, payload }: { x: number; y: number; payload: { value: number } }) => {
    const timestamp = payload.value;
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isMidnight = midnightTs !== null && timestamp === midnightTs;
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

// Top date axis tick: shows short date label above the chart.
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

// ── Section ───────────────────────────────────────────────────────────────────

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

// ── Speed sub-chart ───────────────────────────────────────────────────────────

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

// ── Ping sub-chart ────────────────────────────────────────────────────────────

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

// ── Speed chart ───────────────────────────────────────────────────────────────

function SpeedHistoryChart({ results, height }: { results: SpeedtestTrackerResult[]; height: number }) {
  const board = useRequiredBoard();
  const theme = useMantineTheme();

  const data = useMemo(
    () =>
      [...results]
        .sort(
          (resultA, resultB) =>
            parseTimestamp(resultA.created_at).getTime() - parseTimestamp(resultB.created_at).getTime(),
        )
        // Skip failed/zero-value results — treat 0 bits as "no result"
        .filter((result) => (result.download_bits ?? 0) > 0)
        .map((result) => ({
          ts: parseTimestamp(result.created_at).getTime(),
          Download: parseFloat(((result.download_bits ?? 0) / 1_000_000).toFixed(2)),
          Upload:
            result.upload_bits != null && result.upload_bits > 0
              ? parseFloat((result.upload_bits / 1_000_000).toFixed(2))
              : 0,
        })),
    [results],
  );

  // ── Y axis: nice round ticks ──────────────────────────────────────────────
  const yConfig = useMemo(() => {
    const maxVal = Math.max(...data.map((datum) => Math.max(datum.Download, datum.Upload)), 0);
    const step = maxVal <= 400 ? 100 : 200;
    const roundedMax = Math.ceil(maxVal / step) * step || step;
    const ticks: number[] = [];
    for (let val = 0; val <= roundedMax; val += step) ticks.push(val);
    return { ticks, domain: [0, roundedMax] as [number, number] };
  }, [data]);

  const { midnightTs, xTicks, topDateTicks } = useMemo(() => buildXAxisTicks(data), [data]);
  const renderXTick = useMemo(() => makeXTickRenderer(midnightTs), [midnightTs]);

  if (data.length === 0) return null;

  return (
    <AreaChart
      h={height}
      data={data}
      dataKey="ts"
      series={[
        { name: "Download", color: "blue" },
        { name: "Upload", color: "teal" },
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
        // Extra height for date label below time at midnight ticks
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
          const timestamp = typeof label === "number" ? label : Number(label);
          const dateStr = Number.isNaN(timestamp)
            ? ""
            : new Date(timestamp).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
          return <ChartTooltip label={dateStr} payload={payload} valueFormatter={(val: number) => `${val} Mbps`} />;
        },
      }}
    >
      {/* Top date axis — shows day labels above the chart */}
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
      {/* Dotted vertical reference lines at each x-axis tick */}
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

// ── Ping chart ────────────────────────────────────────────────────────────────

function PingHistoryChart({ results, height }: { results: SpeedtestTrackerResult[]; height: number }) {
  const board = useRequiredBoard();
  const theme = useMantineTheme();

  const data = useMemo(
    () =>
      [...results]
        .sort(
          (resultA, resultB) =>
            parseTimestamp(resultA.created_at).getTime() - parseTimestamp(resultB.created_at).getTime(),
        )
        .filter((result) => result.ping != null)
        .map((result) => ({
          ts: parseTimestamp(result.created_at).getTime(),
          Ping: result.ping as number,
        })),
    [results],
  );

  // ── Y axis: nice round ticks scaled to ping range ─────────────────────────
  const yConfig = useMemo(() => {
    const maxVal = Math.max(...data.map((datum) => datum.Ping), 0);
    const step = maxVal <= 10 ? 2 : maxVal <= 50 ? 10 : maxVal <= 200 ? 50 : 100;
    const roundedMax = Math.ceil(maxVal / step) * step || step;
    const ticks: number[] = [];
    for (let val = 0; val <= roundedMax; val += step) ticks.push(val);
    return { ticks, domain: [0, roundedMax] as [number, number] };
  }, [data]);

  const { midnightTs, xTicks } = useMemo(() => buildXAxisTicks(data), [data]);
  const renderXTick = useMemo(() => makeXTickRenderer(midnightTs), [midnightTs]);

  if (data.length === 0) return null;

  return (
    <AreaChart
      h={height}
      data={data}
      dataKey="ts"
      series={[{ name: "Ping", color: "orange" }]}
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
          const timestamp = typeof label === "number" ? label : Number(label);
          const dateStr = Number.isNaN(timestamp)
            ? ""
            : new Date(timestamp).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
          return <ChartTooltip label={dateStr} payload={payload} valueFormatter={(val: number) => `${val} ms`} />;
        },
      }}
    >
      {/* Dotted vertical reference lines at each x-axis tick */}
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
