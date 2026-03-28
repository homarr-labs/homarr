"use client";

import { useMemo } from "react";
import { AreaChart, ChartTooltip } from "@mantine/charts";
import { Card, Flex, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconArrowDown, IconArrowUp, IconCircleCheck, IconCircleX, IconWaveSine } from "@tabler/icons-react";
import { ReferenceLine, XAxis } from "recharts";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import type {
  SpeedtestTrackerDashboardData,
  SpeedtestTrackerResult,
  SpeedtestTrackerStats,
} from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationDataError } from "../errors/no-data-integration";

export default function SpeedtestTrackerWidget({
  options,
  integrationIds,
  isEditMode,
}: WidgetComponentProps<"speedtestTracker">) {
  if (integrationIds.length === 0) {
    throw new NoIntegrationDataError();
  }

  return <SpeedtestTrackerContent integrationIds={integrationIds} options={options} isEditMode={isEditMode} />;
}

// ─── Main content ──────────────────────────────────────────────────────────────

interface SpeedtestTrackerContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"speedtestTracker">["options"];
  isEditMode: boolean;
}

function SpeedtestTrackerContent({ integrationIds, options, isEditMode }: SpeedtestTrackerContentProps) {
  const t = useScopedI18n("widget.speedtestTracker");
  const [dashboardData] = clientApi.widget.speedtestTracker.getDashboard.useSuspenseQuery({ integrationIds });

  const utils = clientApi.useUtils();
  clientApi.widget.speedtestTracker.subscribeToDashboard.useSubscription(
    { integrationIds },
    {
      enabled: !isEditMode,
      onData(newData) {
        utils.widget.speedtestTracker.getDashboard.setData({ integrationIds }, (prevData) => {
          if (!prevData) return prevData;
          return prevData.map((instance) =>
            instance.integrationId === newData.integrationId
              ? { ...instance, dashboard: newData.dashboard, updatedAt: newData.timestamp }
              : instance,
          );
        });
      },
    },
  );

  const combined = useMemo(
    () =>
      dashboardData.reduce<SpeedtestTrackerDashboardData>(
        (acc, item) => ({
          latestResult: item.dashboard.latestResult ?? acc.latestResult,
          stats: mergeStats(acc.stats, item.dashboard.stats),
          recentResults: [...acc.recentResults, ...item.dashboard.recentResults],
        }),
        { latestResult: null, stats: null, recentResults: [] },
      ),
    [dashboardData],
  );

  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  const recentFiltered = combined.recentResults.filter((r) => parseTimestamp(r.created_at).getTime() > twelveHoursAgo);

  // Stats group: latest result and/or averages — takes flex 1 (top 1/3 when chart also shown)
  const hasStatSection =
    (options.showLatestResult && combined.latestResult !== null) || (options.showStats && combined.stats !== null);
  // Chart section — takes flex 2 (bottom 2/3 when stats also shown)
  const hasChart = options.showRecentResults && recentFiltered.length > 0;
  const noSectionsEnabled = !options.showLatestResult && !options.showStats && !options.showRecentResults;

  return (
    <Stack h="100%" gap="sm" p="xs" style={{ overflow: "hidden" }}>
      {hasStatSection && (
        // Inner Stack: latest + averages each take 50% of this container
        <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
          {options.showLatestResult && combined.latestResult && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <LatestResultSection result={combined.latestResult} />
            </div>
          )}
          {options.showStats && combined.stats && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <AveragesSection stats={combined.stats} />
            </div>
          )}
        </Stack>
      )}
      {hasChart && (
        <div style={{ flex: 2, minHeight: 0 }}>
          <RecentResultsSection results={recentFiltered} />
        </div>
      )}
      {noSectionsEnabled && (
        <Text c="dimmed" ta="center" size="sm">
          {t("noSectionsEnabled")}
        </Text>
      )}
    </Stack>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function LatestResultSection({ result }: { result: SpeedtestTrackerResult }) {
  const t = useScopedI18n("widget.speedtestTracker");
  const timestamp = parseTimestamp(result.created_at).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const cols = result.healthy !== null ? 4 : 3;

  return (
    <Stack gap={6} h="100%">
      <Group justify="space-between" align="center" wrap="nowrap">
        <SectionLabel>{t("latestResult")}</SectionLabel>
        <Text size="xs" c="dimmed">
          {timestamp}
        </Text>
      </Group>
      <SimpleGrid cols={cols} spacing="xs" style={{ flex: 1, gridTemplateRows: "1fr" }}>
        <SpeedStatCard
          icon={IconArrowDown}
          color="blue"
          value={formatResultSpeed(result, "download")}
          label="Download"
        />
        <SpeedStatCard icon={IconArrowUp} color="teal" value={formatResultSpeed(result, "upload")} label="Upload" />
        <SpeedStatCard
          icon={IconWaveSine}
          color="orange"
          value={result.ping !== null ? `${result.ping.toFixed(1)} ms` : "—"}
          label="Ping"
        />
        {result.healthy !== null && (
          <SpeedStatCard
            icon={result.healthy ? IconCircleCheck : IconCircleX}
            color={result.healthy ? "green" : "red"}
            value={result.healthy ? t("healthy") : t("unhealthy")}
            label="Status"
          />
        )}
      </SimpleGrid>
    </Stack>
  );
}

function AveragesSection({ stats }: { stats: SpeedtestTrackerStats }) {
  const t = useScopedI18n("widget.speedtestTracker");

  return (
    <Stack gap={6} h="100%">
      <SectionLabel>
        {t("averages")} · {stats.total_results} {t("tests")}
      </SectionLabel>
      <SimpleGrid cols={3} spacing="xs" style={{ flex: 1, gridTemplateRows: "1fr" }}>
        <SpeedStatCard
          icon={IconArrowDown}
          color="blue"
          value={formatStatsSpeed(stats.download)}
          label="Avg Download"
          compact
        />
        <SpeedStatCard
          icon={IconArrowUp}
          color="teal"
          value={formatStatsSpeed(stats.upload)}
          label="Avg Upload"
          compact
        />
        <SpeedStatCard
          icon={IconWaveSine}
          color="orange"
          value={`${stats.ping.avg.toFixed(1)} ms`}
          label="Avg Ping"
          compact
        />
      </SimpleGrid>
    </Stack>
  );
}

function RecentResultsSection({ results }: { results: SpeedtestTrackerResult[] }) {
  const t = useScopedI18n("widget.speedtestTracker");
  const { ref, height } = useElementSize<HTMLDivElement>();

  return (
    <Stack gap={4} h="100%" style={{ minHeight: 0 }}>
      <SectionLabel>{t("recentResults")}</SectionLabel>
      <div ref={ref} style={{ flex: 1, minHeight: 0 }}>
        {height > 0 && <SpeedHistoryChart results={results} height={height} />}
      </div>
    </Stack>
  );
}

// ─── Speed history chart ──────────────────────────────────────────────────────

function SpeedHistoryChart({ results, height }: { results: SpeedtestTrackerResult[]; height: number }) {
  const data = useMemo(
    () =>
      [...results]
        .sort((a, b) => parseTimestamp(a.created_at).getTime() - parseTimestamp(b.created_at).getTime())
        // Skip failed/zero-value results — treat 0 bits as "no result"
        .filter((r) => (r.download_bits ?? 0) > 0)
        .map((r) => ({
          ts: parseTimestamp(r.created_at).getTime(),
          Download: parseFloat(((r.download_bits as number) / 1_000_000).toFixed(2)),
          Upload: r.upload_bits != null && r.upload_bits > 0 ? parseFloat((r.upload_bits / 1_000_000).toFixed(2)) : 0,
        })),
    [results],
  );

  // ── Y axis: nice round ticks ──────────────────────────────────────────────
  const yConfig = useMemo(() => {
    const maxVal = Math.max(...data.map((d) => Math.max(d.Download, d.Upload)), 0);
    const step = maxVal <= 400 ? 100 : 200;
    const roundedMax = Math.ceil(maxVal / step) * step || step;
    const ticks: number[] = [];
    for (let v = 0; v <= roundedMax; v += step) ticks.push(v);
    return { ticks, domain: [0, roundedMax] as [number, number] };
  }, [data]);

  // ── X axis: 2-hour interval ticks + midnight ──────────────────────────────
  const { midnightTs, xTicks, topDateTicks } = useMemo(() => {
    if (data.length === 0) return { midnightTs: null as null, xTicks: [] as number[], topDateTicks: [] as number[] };

    const first = (data[0] as (typeof data)[0]).ts;
    const last = (data[data.length - 1] as (typeof data)[0]).ts;

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
      xTicks: Array.from(tickSet).sort((a, b) => a - b),
      topDateTicks: topTicks,
    };
  }, [data]);

  // Custom tick: time for all ticks, date label below time at midnight
  const renderXTick = ({ x, y, payload }: { x: number; y: number; payload: { value: number } }) => {
    const ts = payload.value;
    const d = new Date(ts);
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isMidnight = midnightTs !== null && ts === midnightTs;
    const dateStr = isMidnight ? d.toLocaleDateString([], { month: "short", day: "numeric" }) : null;

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

  // Top date axis tick: shows short date label above the chart
  const renderTopDateTick = (props: { x: number; y: number; payload: { value: number }; index: number }) => {
    const { x, y, payload, index } = props;
    const d = new Date(payload.value);
    const dateStr = d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    const anchor = index === 0 ? "start" : "middle";
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={-4} textAnchor={anchor} fontSize={10} fill="var(--mantine-color-dimmed)">
          {dateStr}
        </text>
      </g>
    );
  };

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
      valueFormatter={(v: number) => `${v} Mbps`}
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
        tickFormatter: (v: number) => `${v}`,
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
          const ts = typeof label === "number" ? label : Number(label);
          const dateStr = Number.isNaN(ts)
            ? ""
            : new Date(ts).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
          return <ChartTooltip label={dateStr} payload={payload} valueFormatter={(v: number) => `${v} Mbps`} />;
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
      {xTicks.map((ts) => (
        <ReferenceLine
          key={ts}
          x={ts}
          yAxisId="left"
          stroke="var(--mantine-color-dimmed)"
          strokeDasharray="3 3"
          strokeOpacity={0.35}
        />
      ))}
    </AreaChart>
  );
}

interface SpeedStatCardProps {
  icon: TablerIcon;
  color: string;
  value: string;
  label: string;
  compact?: boolean;
}

function SpeedStatCard({ icon: Icon, color, value, label, compact = false }: SpeedStatCardProps) {
  const { ref, height, width } = useElementSize<HTMLDivElement>();
  const board = useRequiredBoard();
  const isWide = width > height + 20;
  const hideLabel = height > 0 && height <= 38;

  return (
    <Card
      ref={ref}
      p={compact ? "xs" : "sm"}
      radius={board.itemRadius}
      bg={`var(--mantine-color-${color}-light)`}
      h="100%"
      style={{ flex: 1 }}
    >
      <Flex
        h="100%"
        w="100%"
        align="center"
        justify="center"
        direction={isWide ? "row" : "column"}
        gap={isWide ? 8 : 4}
      >
        <Icon size={compact ? 16 : 20} color={`var(--mantine-color-${color}-5)`} style={{ flexShrink: 0 }} />
        <Flex direction="column" align={isWide ? "flex-start" : "center"} gap={0}>
          <Text size={compact ? "sm" : "md"} fw={700} ta="center" lh={1.1}>
            {value}
          </Text>
          {!hideLabel && (
            <Text size="xs" c="dimmed" ta="center" lh={1.3}>
              {label}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
      {children}
    </Text>
  );
}

// ─── Pure data helpers ────────────────────────────────────────────────────────

/**
 * Parse a Speedtest Tracker timestamp. The API returns UTC timestamps without
 * a timezone indicator (e.g. "2026-03-28 05:45:00"). We append "Z" to force
 * UTC parsing so JS converts it to local time correctly.
 */
const parseTimestamp = (ts: string): Date => new Date(ts.replace(" ", "T") + "Z");

const mergeStats = (
  a: SpeedtestTrackerDashboardData["stats"],
  b: SpeedtestTrackerDashboardData["stats"],
): SpeedtestTrackerDashboardData["stats"] => {
  if (!b) return a;
  if (!a) return b;
  return {
    ping: {
      avg: (a.ping.avg + b.ping.avg) / 2,
      min: Math.min(a.ping.min, b.ping.min),
      max: Math.max(a.ping.max, b.ping.max),
    },
    download: {
      avg: (a.download.avg + b.download.avg) / 2,
      avg_bits:
        a.download.avg_bits !== undefined && b.download.avg_bits !== undefined
          ? (a.download.avg_bits + b.download.avg_bits) / 2
          : (a.download.avg_bits ?? b.download.avg_bits),
      min: Math.min(a.download.min, b.download.min),
      max: Math.max(a.download.max, b.download.max),
    },
    upload: {
      avg: (a.upload.avg + b.upload.avg) / 2,
      avg_bits:
        a.upload.avg_bits !== undefined && b.upload.avg_bits !== undefined
          ? (a.upload.avg_bits + b.upload.avg_bits) / 2
          : (a.upload.avg_bits ?? b.upload.avg_bits),
      min: Math.min(a.upload.min, b.upload.min),
      max: Math.max(a.upload.max, b.upload.max),
    },
    total_results: a.total_results + b.total_results,
  };
};

const formatBitsPerSec = (bps: number): string => {
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
  return `${bps} bps`;
};

const formatResultSpeed = (result: SpeedtestTrackerResult, dir: "download" | "upload"): string => {
  const human = dir === "download" ? result.download_bits_human : result.upload_bits_human;
  if (human) return human;
  const bits = dir === "download" ? result.download_bits : result.upload_bits;
  if (bits != null) return formatBitsPerSec(bits);
  return "—";
};

const formatStatsSpeed = (band: SpeedtestTrackerStats["download"] | SpeedtestTrackerStats["upload"]): string => {
  if (band.avg_bits_human) return band.avg_bits_human;
  if (band.avg_bits != null) return formatBitsPerSec(band.avg_bits);
  // avg is bytes/s — convert to bits/s
  return formatBitsPerSec(band.avg * 8);
};
