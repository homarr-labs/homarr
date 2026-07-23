"use client";

import type { CSSProperties } from "react";
import { DonutChart } from "@mantine/charts";
import { Group, Progress, ScrollArea, Stack, Text } from "@mantine/core";

import type { PatchMonOsDistributionEntry } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

const OS_COLORS = [
  "blue.6",
  "orange.6",
  "green.6",
  "grape.6",
  "cyan.6",
  "pink.6",
  "yellow.6",
  "teal.6",
] as const;

interface OsDistributionSectionProps {
  entries: PatchMonOsDistributionEntry[];
  limit: number;
  showOsVersion: boolean;
  displayMode: "bars" | "donut";
  width: number;
  height: number;
  showLegend: boolean;
  compact?: boolean;
}

export const formatOsLabel = (entry: PatchMonOsDistributionEntry, showVersion: boolean) =>
  showVersion && entry.osVersion ? `${entry.name} ${entry.osVersion}` : entry.name;

const getMantineColorVariable = (color: string) => `var(--mantine-color-${color.replace(".", "-")})`;

export function OsDistributionSection({
  entries,
  limit,
  showOsVersion,
  displayMode,
  width,
  height,
  showLegend,
  compact = false,
}: OsDistributionSectionProps) {
  const t = useScopedI18n("widget.patchmon");

  if (entries.length === 0) {
    return null;
  }

  const visibleEntries = limit > 0 ? entries.slice(0, limit) : entries;

  if (displayMode === "donut") {
    const chartData = visibleEntries.map((entry, i) => ({
      name: formatOsLabel(entry, showOsVersion),
      value: entry.count,
      color: OS_COLORS[i % OS_COLORS.length] as string,
    }));
    const donutSize = compact
      ? Math.max(36, Math.min(width - 18, height - 10, 96))
      : Math.max(48, Math.min(width - 24, height * 0.55, showLegend ? 140 : 180));

    return (
      <Stack gap={4} className={classes.osSection} h="100%">
        {!compact && (
          <Text size="xs" c="dimmed" fw={500} className={classes.osHeading}>
            {t("osDistribution")}
          </Text>
        )}
        <div className={`${classes.osDonutContent} ${showLegend ? classes.osDonutContentWithLegend : ""}`}>
          <div className={classes.osDonut}>
            <DonutChart
              data={chartData}
              size={donutSize}
              withTooltip
              tooltipDataSource="segment"
              paddingAngle={2}
            />
          </div>
          {showLegend && (
            <div className={classes.osLegend}>
              {chartData.map((entry) => (
                <div key={entry.name} className={classes.osLegendItem}>
                  <span
                    className={classes.osLegendSwatch}
                    style={{ "--os-color": getMantineColorVariable(entry.color) } as CSSProperties}
                  />
                  <span className={classes.osLegendLabel} title={entry.name}>
                    {entry.name}
                  </span>
                  <Text component="span" size="xs" fw={600} className={classes.osLegendValue}>
                    {entry.value}
                  </Text>
                </div>
              ))}
            </div>
          )}
        </div>
      </Stack>
    );
  }

  const maxCount = Math.max(...visibleEntries.map((entry) => entry.count), 1);

  if (compact) {
    const maxRows = Math.max(2, Math.min(visibleEntries.length, Math.floor(height / 28), width < 160 ? 2 : 4));
    const compactEntries = visibleEntries.slice(0, maxRows);
    if (compactEntries.length === 0) return null;

    return (
      <div className={classes.compactOsBars}>
        {compactEntries.map((entry, i) => (
          <div key={`${entry.name}-${entry.osVersion ?? ""}`} className={classes.compactOsBar}>
            <Text size="xs" className={classes.compactOsLabel} truncate="end" title={formatOsLabel(entry, showOsVersion)}>
              {formatOsLabel(entry, showOsVersion)}
            </Text>
            <Group gap={6} wrap="nowrap" className={classes.osBarGroup}>
              <Progress
                value={(entry.count / maxCount) * 100}
                size="sm"
                radius="sm"
                className={classes.osBar}
                color={OS_COLORS[i % OS_COLORS.length]}
              />
              <Text size="xs" fw={700} className={classes.osCount}>
                {entry.count}
              </Text>
            </Group>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Stack gap={4} className={classes.osSection} h="100%">
      <Text size="xs" c="dimmed" fw={500} className={classes.osHeading}>
        {t("osDistribution")}
      </Text>
      <ScrollArea className={classes.osScroll} scrollbars="y">
        <Stack gap={6} pr={4}>
          {visibleEntries.map((entry, i) => {
            const barValue = (entry.count / maxCount) * 100;
            const barColor = OS_COLORS[i % OS_COLORS.length] as string;
            return (
              <div key={`${entry.name}-${entry.osVersion ?? ""}`} className={classes.osRow}>
                <Text size="xs" className={classes.osLabel} truncate="end" title={formatOsLabel(entry, showOsVersion)}>
                  {formatOsLabel(entry, showOsVersion)}
                </Text>
                <Group gap={6} wrap="nowrap" className={classes.osBarGroup}>
                  <Progress value={barValue} size="sm" radius="sm" className={classes.osBar} color={barColor} />
                  <Text size="xs" fw={600} className={classes.osCount}>
                    {entry.count}
                  </Text>
                </Group>
              </div>
            );
          })}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
