"use client";

import { List, Text } from "@mantine/core";

import type { ConfigEntityCounts } from "@homarr/board-portability";

const countLabelKeys: Record<keyof ConfigEntityCounts, string> = {
  boards: "management.page.importExport.summary.boards",
  apps: "management.page.importExport.summary.apps",
  integrations: "management.page.importExport.summary.integrations",
  secrets: "management.page.importExport.summary.secrets",
  widgets: "management.page.importExport.summary.widgets",
  sections: "management.page.importExport.summary.sections",
  layouts: "management.page.importExport.summary.layouts",
  searchEngines: "management.page.importExport.summary.searchEngines",
  groups: "management.page.importExport.summary.groups",
  serverSettings: "management.page.importExport.summary.serverSettings",
};

const countEntries = (counts: ConfigEntityCounts) =>
  (Object.keys(countLabelKeys) as (keyof ConfigEntityCounts)[]).filter((key) => counts[key] > 0);

type ConfigSummaryListProps = {
  counts: ConfigEntityCounts;
  t: (key: string, values?: Record<string, unknown>) => string;
};

export const ConfigSummaryList = ({ counts, t }: ConfigSummaryListProps) => {
  const entries = countEntries(counts);

  if (entries.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {t("management.page.importExport.summary.empty")}
      </Text>
    );
  }

  return (
    <List size="sm" spacing={4}>
      {entries.map((key) => (
        <List.Item key={key}>
          {t(countLabelKeys[key], { count: counts[key] })}
        </List.Item>
      ))}
    </List>
  );
};
