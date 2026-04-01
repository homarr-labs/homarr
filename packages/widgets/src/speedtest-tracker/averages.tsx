"use client";

import { SimpleGrid, Stack } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconWaveSine } from "@tabler/icons-react";

import type { SpeedtestTrackerStats } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { formatStatsSpeed } from "./helpers";
import { SectionLabel } from "./section-label";
import { SpeedStatCard } from "./speed-stat-card";

export function AveragesSection({ stats }: { stats: SpeedtestTrackerStats }) {
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
          label={t("avgDownload")}
          compact
        />
        <SpeedStatCard
          icon={IconArrowUp}
          color="teal"
          value={formatStatsSpeed(stats.upload)}
          label={t("avgUpload")}
          compact
        />
        <SpeedStatCard
          icon={IconWaveSine}
          color="orange"
          value={`${stats.ping.avg.toFixed(1)} ms`}
          label={t("avgPing")}
          compact
        />
      </SimpleGrid>
    </Stack>
  );
}
