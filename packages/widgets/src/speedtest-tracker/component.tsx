"use client";

import { Badge, Group, ScrollArea, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconWaveSine } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { SpeedtestTrackerDashboardData, SpeedtestTrackerResult } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

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

  return (
    <SpeedtestTrackerContent integrationIds={integrationIds} options={options} isEditMode={isEditMode} />
  );
}

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

  const combined = dashboardData.reduce<SpeedtestTrackerDashboardData>(
    (acc, item) => {
      const { latestResult, stats, recentResults } = item.dashboard;

      return {
        latestResult: latestResult ?? acc.latestResult,
        stats: stats
          ? acc.stats
            ? {
                total_results: acc.stats.total_results + stats.total_results,
                avg_ping: (acc.stats.avg_ping + stats.avg_ping) / 2,
                avg_download: (acc.stats.avg_download + stats.avg_download) / 2,
                avg_upload: (acc.stats.avg_upload + stats.avg_upload) / 2,
                min_ping: Math.min(acc.stats.min_ping, stats.min_ping),
                min_download: Math.min(acc.stats.min_download, stats.min_download),
                min_upload: Math.min(acc.stats.min_upload, stats.min_upload),
                max_ping: Math.max(acc.stats.max_ping, stats.max_ping),
                max_download: Math.max(acc.stats.max_download, stats.max_download),
                max_upload: Math.max(acc.stats.max_upload, stats.max_upload),
              }
            : stats
          : acc.stats,
        recentResults: [...acc.recentResults, ...recentResults],
      };
    },
    { latestResult: null, stats: null, recentResults: [] },
  );

  const noSectionsEnabled = !options.showLatestResult && !options.showStats && !options.showRecentResults;

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {options.showLatestResult && combined.latestResult && (
          <LatestResultCard result={combined.latestResult} />
        )}
        {options.showStats && combined.stats && (
          <StatsCard
            avgDownload={combined.stats.avg_download}
            avgUpload={combined.stats.avg_upload}
            avgPing={combined.stats.avg_ping}
            totalResults={combined.stats.total_results}
          />
        )}
        {options.showRecentResults && combined.recentResults.length > 0 && (
          <RecentResultsList results={combined.recentResults.slice(0, 10)} />
        )}
        {noSectionsEnabled && (
          <Text c="dimmed" ta="center">
            {t("noSectionsEnabled")}
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface LatestResultCardProps {
  result: SpeedtestTrackerResult;
}

function LatestResultCard({ result }: LatestResultCardProps) {
  const t = useScopedI18n("widget.speedtestTracker");

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {t("latestResult")}
      </Text>
      <Group gap="xs" wrap="wrap">
        {result.download_bits_human && (
          <Group gap={4}>
            <ThemeIcon size="xs" variant="transparent" c="blue">
              <IconArrowDown size={12} />
            </ThemeIcon>
            <Text size="sm" fw={500}>
              {result.download_bits_human}
            </Text>
          </Group>
        )}
        {result.upload_bits_human && (
          <Group gap={4}>
            <ThemeIcon size="xs" variant="transparent" c="teal">
              <IconArrowUp size={12} />
            </ThemeIcon>
            <Text size="sm" fw={500}>
              {result.upload_bits_human}
            </Text>
          </Group>
        )}
        {result.ping !== null && (
          <Group gap={4}>
            <ThemeIcon size="xs" variant="transparent" c="orange">
              <IconWaveSine size={12} />
            </ThemeIcon>
            <Text size="sm" fw={500}>
              {result.ping.toFixed(1)} ms
            </Text>
          </Group>
        )}
        {result.healthy !== null && (
          <Badge size="xs" color={result.healthy ? "green" : "red"} variant="light">
            {result.healthy ? t("healthy") : t("unhealthy")}
          </Badge>
        )}
      </Group>
    </Stack>
  );
}

interface StatsCardProps {
  avgDownload: number;
  avgUpload: number;
  avgPing: number;
  totalResults: number;
}

function StatsCard({ avgDownload, avgUpload, avgPing, totalResults }: StatsCardProps) {
  const t = useScopedI18n("widget.speedtestTracker");

  const formatMbps = (bits: number) => `${(bits / 1_000_000).toFixed(1)} Mbps`;

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {t("averages")} ({totalResults} {t("tests")})
      </Text>
      <Group gap="xs" wrap="wrap">
        <Group gap={4}>
          <ThemeIcon size="xs" variant="transparent" c="blue">
            <IconArrowDown size={12} />
          </ThemeIcon>
          <Text size="sm">{formatMbps(avgDownload)}</Text>
        </Group>
        <Group gap={4}>
          <ThemeIcon size="xs" variant="transparent" c="teal">
            <IconArrowUp size={12} />
          </ThemeIcon>
          <Text size="sm">{formatMbps(avgUpload)}</Text>
        </Group>
        <Group gap={4}>
          <ThemeIcon size="xs" variant="transparent" c="orange">
            <IconWaveSine size={12} />
          </ThemeIcon>
          <Text size="sm">{avgPing.toFixed(1)} ms</Text>
        </Group>
      </Group>
    </Stack>
  );
}

interface RecentResultsListProps {
  results: SpeedtestTrackerResult[];
}

function RecentResultsList({ results }: RecentResultsListProps) {
  const t = useScopedI18n("widget.speedtestTracker");

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {t("recentResults")}
      </Text>
      <Stack gap={2}>
        {results.map((result) => (
          <Group key={result.id} gap="xs" justify="space-between" wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {new Date(result.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            <Group gap={6} wrap="nowrap">
              {result.download_bits_human && (
                <Group gap={2} wrap="nowrap">
                  <IconArrowDown size={10} />
                  <Text size="xs">{result.download_bits_human}</Text>
                </Group>
              )}
              {result.upload_bits_human && (
                <Group gap={2} wrap="nowrap">
                  <IconArrowUp size={10} />
                  <Text size="xs">{result.upload_bits_human}</Text>
                </Group>
              )}
              {result.ping !== null && (
                <Text size="xs" c="dimmed">
                  {result.ping.toFixed(0)} ms
                </Text>
              )}
            </Group>
            {result.healthy !== null && (
              <Badge size="xs" color={result.healthy ? "green" : "red"} variant="dot" style={{ flexShrink: 0 }}>
                {result.healthy ? t("ok") : t("fail")}
              </Badge>
            )}
          </Group>
        ))}
      </Stack>
    </Stack>
  );
}
