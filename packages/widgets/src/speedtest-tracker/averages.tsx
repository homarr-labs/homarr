"use client";

import { SimpleGrid, Stack } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconWaveSine } from "@tabler/icons-react";

import type { SpeedtestTrackerStats } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { formatStatsSpeed } from "./helpers";
import { SectionLabel } from "./section-label";
import { SpeedStatCard } from "./speed-stat-card";

export function AveragesSection({
  stats,
  width = 500,
  compactSurface = false,
}: {
  stats: SpeedtestTrackerStats;
  width?: number;
  compactSurface?: boolean;
}) {
  const t = useI18n("widget.speedtestTracker");

  return (
    <Stack gap={6} h="100%">
      <SectionLabel uppercase={compactSurface}>
        {t("averages")} · {t("tests", { count: stats.total_results.toString() })}
      </SectionLabel>
      <SimpleGrid cols={width < 220 ? 1 : 3} spacing="xs" style={{ flex: 1, gridTemplateRows: "1fr" }}>
        <SpeedStatCard
          icon={IconArrowDown}
          color="blue"
          value={formatStatsSpeed(stats.download)}
          label={t("avgDownload")}
          compact
          legacySurface={compactSurface}
        />
        <SpeedStatCard
          icon={IconArrowUp}
          color="teal"
          value={formatStatsSpeed(stats.upload)}
          label={t("avgUpload")}
          compact
          legacySurface={compactSurface}
        />
        <SpeedStatCard
          icon={IconWaveSine}
          color="orange"
          value={`${stats.ping.avg.toFixed(1)} ms`}
          label={t("avgPing")}
          compact
          legacySurface={compactSurface}
        />
      </SimpleGrid>
    </Stack>
  );
}
