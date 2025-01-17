import type react from "react";
import type { MantineColor, RingProgressProps } from "@mantine/core";
import { Box, Center, Grid, Group, RingProgress, Stack, Text, Title, useMantineColorScheme } from "@mantine/core";
import { IconDatabaseHeart, IconFileDescription, IconHeartbeat, IconTransform } from "@tabler/icons-react";

import { humanFileSize } from "@homarr/common";
import type { TdarrPieSegment, TdarrStatistics } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";

const PIE_COLORS: MantineColor[] = ["cyan", "grape", "gray", "orange", "pink"];

interface StatisticsPanelProps {
  statistics: TdarrStatistics;
}

export function StatisticsPanel(props: StatisticsPanelProps) {
  const t = useI18n("widget.mediaTranscoding.panel.statistics");

  const allLibs = props.statistics.pies.find((pie) => pie.libraryName === "All");

  if (!allLibs) {
    return (
      <Center style={{ flex: "1" }}>
        <Title order={3}>{t("empty")}</Title>
      </Center>
    );
  }

  return (
    <Stack style={{ flex: "1" }} gap="xs">
      <Group
        style={{
          flex: 1,
        }}
        justify="apart"
        align="center"
        wrap="nowrap"
      >
        <Stack align="center" gap={0}>
          <RingProgress size={120} sections={toRingProgressSections(allLibs.transcodeStatus)} />
          <Text size="xs">{t("transcodes")}</Text>
        </Stack>
        <Grid gutter="xs">
          <Grid.Col span={6}>
            <StatBox
              icon={<IconTransform size={18} />}
              label={t("transcodesCount", {
                value: props.statistics.totalTranscodeCount,
              })}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <StatBox
              icon={<IconHeartbeat size={18} />}
              label={t("healthChecksCount", {
                value: props.statistics.totalHealthCheckCount,
              })}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <StatBox
              icon={<IconFileDescription size={18} />}
              label={t("filesCount", {
                value: props.statistics.totalFileCount,
              })}
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <StatBox
              icon={<IconDatabaseHeart size={18} />}
              label={t("savedSpace", {
                value: humanFileSize(Math.floor(allLibs.savedSpace)),
              })}
            />
          </Grid.Col>
        </Grid>
        <Stack align="center" gap={0}>
          <RingProgress size={120} sections={toRingProgressSections(allLibs.healthCheckStatus)} />
          <Text size="xs">{t("healthChecks")}</Text>
        </Stack>
      </Group>
      <Group
        style={{
          flex: 1,
        }}
        justify="space-between"
        align="center"
        wrap="nowrap"
        w="100%"
      >
        <Stack align="center" gap={0}>
          <RingProgress size={120} sections={toRingProgressSections(allLibs.videoCodecs)} />
          <Text size="xs">{t("videoCodecs")}</Text>
        </Stack>
        <Stack align="center" gap={0}>
          <RingProgress size={120} sections={toRingProgressSections(allLibs.videoContainers)} />
          <Text size="xs">{t("videoContainers")}</Text>
        </Stack>
        <Stack align="center" gap={0}>
          <RingProgress size={120} sections={toRingProgressSections(allLibs.videoResolutions)} />
          <Text size="xs">{t("videoResolutions")}</Text>
        </Stack>
      </Group>
    </Stack>
  );
}

function toRingProgressSections(segments: TdarrPieSegment[]): RingProgressProps["sections"] {
  const total = segments.reduce((prev, curr) => prev + curr.value, 0);
  return segments.map((segment, index) => ({
    value: (segment.value * 100) / total,
    tooltip: `${segment.name}: ${segment.value}`,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    color: PIE_COLORS[index % PIE_COLORS.length]!, // Ensures a valid color in the case that index > PIE_COLORS.length
  }));
}

interface StatBoxProps {
  icon: react.ReactNode;
  label: string;
}

function StatBox(props: StatBoxProps) {
  const { colorScheme } = useMantineColorScheme();
  return (
    <Box
      style={(theme) => ({
        padding: theme.spacing.xs,
        border: "1px solid",
        borderRadius: theme.radius.md,
        borderColor: colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1],
      })}
    >
      <Stack gap="xs" align="center">
        {props.icon}
        <Text size="xs">{props.label}</Text>
      </Stack>
    </Box>
  );
}
