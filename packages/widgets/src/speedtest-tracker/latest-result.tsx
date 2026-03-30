"use client";

import { Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconCircleCheck, IconCircleX, IconWaveSine } from "@tabler/icons-react";

import type { SpeedtestTrackerResult } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

import { formatResultSpeed, parseTimestamp } from "./helpers";
import { SectionLabel } from "./section-label";
import { SpeedStatCard } from "./speed-stat-card";

export function LatestResultSection({ result }: { result: SpeedtestTrackerResult }) {
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
