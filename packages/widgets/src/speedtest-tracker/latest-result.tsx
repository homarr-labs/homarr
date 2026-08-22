"use client";

import { Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconCircleCheck, IconCircleX, IconWaveSine } from "@tabler/icons-react";

import type { SpeedtestTrackerResult } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { formatResultSpeed } from "./helpers";
import { SectionLabel } from "./section-label";
import { SpeedStatCard } from "./speed-stat-card";

export function LatestResultSection({ result, width = 500 }: { result: SpeedtestTrackerResult; width?: number }) {
  const t = useI18n("widget.speedtestTracker");
  const locale = useCurrentIntlLocale();
  const timestamp = Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(result.created_at);
  const metricCount = result.healthy !== null ? 4 : 3;
  const cols = width < 230 ? 2 : metricCount;

  return (
    <Stack gap={6} h="100%">
      <Group justify="space-between" align="center" wrap="nowrap">
        <SectionLabel>{t("latestResult")}</SectionLabel>
        <Text size="xs" c="dimmed" truncate title={timestamp} style={{ minWidth: 0 }}>
          {timestamp}
        </Text>
      </Group>
      <SimpleGrid cols={cols} spacing="xs" style={{ flex: 1, gridTemplateRows: "1fr" }}>
        <SpeedStatCard
          icon={IconArrowDown}
          color="blue"
          value={formatResultSpeed(result, "download")}
          label={t("download")}
        />
        <SpeedStatCard
          icon={IconArrowUp}
          color="teal"
          value={formatResultSpeed(result, "upload")}
          label={t("upload")}
        />
        <SpeedStatCard
          icon={IconWaveSine}
          color="orange"
          value={result.ping !== null ? `${result.ping.toFixed(1)} ms` : "—"}
          label={t("ping")}
        />
        {result.healthy !== null && (
          <SpeedStatCard
            icon={result.healthy ? IconCircleCheck : IconCircleX}
            color={result.healthy ? "green" : "red"}
            value={result.healthy ? t("healthy") : t("unhealthy")}
            label={t("status")}
          />
        )}
      </SimpleGrid>
    </Stack>
  );
}
