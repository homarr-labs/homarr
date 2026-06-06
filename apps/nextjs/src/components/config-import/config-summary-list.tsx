"use client";

import { List, Text } from "@mantine/core";

import type { ConfigEntityCounts, ConfigEntityKey } from "@homarr/board-portability";
import { CONFIG_ENTITY_KEYS } from "@homarr/board-portability";

const TRANSLATION_PREFIX = "management.page.importExport.summary";

type ConfigSummaryListProps = {
  counts: ConfigEntityCounts;
  t: (key: string, values?: Record<string, unknown>) => string;
};

export const ConfigSummaryList = ({ counts, t }: ConfigSummaryListProps) => {
  const entries = CONFIG_ENTITY_KEYS.filter((key) => counts[key] > 0);

  if (entries.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t(`${TRANSLATION_PREFIX}.empty`)}
      </Text>
    );
  }

  return (
    <List size="sm" spacing={4}>
      {entries.map((key: ConfigEntityKey) => (
        <List.Item key={key}>
          {t(`${TRANSLATION_PREFIX}.${key}`, { count: counts[key] })}
        </List.Item>
      ))}
    </List>
  );
};
