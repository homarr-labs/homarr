"use client";

import { Group, Progress, ScrollArea, Stack, Text } from "@mantine/core";

import type { PatchMonOsDistributionEntry } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import classes from "./component.module.css";

interface OsDistributionSectionProps {
  entries: PatchMonOsDistributionEntry[];
  limit: number;
  showOsVersion: boolean;
}

export const formatOsLabel = (entry: PatchMonOsDistributionEntry, showVersion: boolean) =>
  showVersion && entry.osVersion ? `${entry.name} ${entry.osVersion}` : entry.name;

export function OsDistributionSection({ entries, limit, showOsVersion }: OsDistributionSectionProps) {
  const t = useScopedI18n("widget.patchmon");

  if (entries.length === 0) {
    return null;
  }

  const visibleEntries = limit > 0 ? entries.slice(0, limit) : entries;
  const maxCount = Math.max(...visibleEntries.map((entry) => entry.count), 1);

  return (
    <Stack gap={4} className={classes.osSection} h="100%">
      <Text size="xs" c="dimmed" fw={500} className={classes.osHeading}>
        {t("osDistribution")}
      </Text>
      <ScrollArea className={classes.osScroll} scrollbars="y">
        <Stack gap={6} pr={4}>
          {visibleEntries.map((entry) => {
            const barValue = (entry.count / maxCount) * 100;
            return (
              <div key={`${entry.name}-${entry.osVersion ?? ""}`} className={classes.osRow}>
                <Text size="xs" className={classes.osLabel} truncate="end" title={formatOsLabel(entry, showOsVersion)}>
                  {formatOsLabel(entry, showOsVersion)}
                </Text>
                <Group gap={6} wrap="nowrap" className={classes.osBarGroup}>
                  <Progress value={barValue} size="sm" radius="sm" className={classes.osBar} />
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
