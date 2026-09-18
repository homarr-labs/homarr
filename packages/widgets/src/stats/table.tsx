import { useCallback, useMemo, useState } from "react";
import { Avatar, Group, ScrollArea, Text } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";

import type { DataTableColumn, DataTableProps } from "mantine-datatable";

import { useI18n } from "@homarr/translation/client";

import { HomarrDataTable } from "../common/homarr-data-table";
import classes from "./table.module.css";

export interface StatsTableRow {
  id: string;
  integrationId: string;
  source: string;
  iconUrl?: string;
  metric: string;
  value: string;
  status: string;
}

interface StatsGroup {
  id: string;
  name: string;
  iconUrl?: string;
  metrics: StatsTableRow[];
}

export function StatsTable({
  records,
  showIcon,
  isEditMode,
}: {
  records: StatsTableRow[];
  showIcon: boolean;
  isEditMode: boolean;
}) {
  const t = useI18n("widget.stats");
  const groups = useMemo(() => {
    const sources = new Map<string, StatsGroup>();
    for (const record of records) {
      let group = sources.get(record.integrationId);
      if (!group) {
        group = { id: record.integrationId, name: record.source, iconUrl: record.iconUrl, metrics: [] };
        sources.set(record.integrationId, group);
      }
      group.metrics.push(record);
    }
    return [...sources.values()];
  }, [records]);
  if (!groups.length)
    return (
      <Text size="xs" c="dimmed" ta="center" p="md">
        {t("empty")}
      </Text>
    );
  return (
    <ScrollArea h="100%" type="auto" offsetScrollbars>
      <div className={classes.columns}>
        {groups.map((group) => (
          <IntegrationTable key={group.id} group={group} showIcon={showIcon} isEditMode={isEditMode} />
        ))}
      </div>
    </ScrollArea>
  );
}

function IntegrationTable({
  group,
  showIcon,
  isEditMode,
}: {
  group: StatsGroup;
  showIcon: boolean;
  isEditMode: boolean;
}) {
  const [opened, setOpened] = useState(true);
  const expandedIds: string[] = [];
  if (opened) expandedIds.push(group.id);
  const columns = useMemo<DataTableColumn<StatsGroup>[]>(
    () => [
      {
        accessor: "name",
        width: 1,
        render: () => (
          <button
            type="button"
            className={classes.heading}
            aria-expanded={opened}
            onClick={(event) => {
              event.stopPropagation();
              setOpened((current) => !current);
            }}
          >
            {showIcon && (
              <Avatar src={group.iconUrl} size={14} radius={2} alt="" imageProps={{ referrerPolicy: "no-referrer" }} />
            )}
            <Text component="span" size="xs" fw={650} truncate style={{ flex: 1 }}>
              {group.name}
            </Text>
            <Text component="span" size="xs" c="dimmed">
              {group.metrics.length}
            </Text>
            <IconChevronDown size={13} className={classes.chevron} data-opened={opened || undefined} />
          </button>
        ),
      },
    ],
    [group, opened, showIcon],
  );
  const renderMetrics = useCallback(() => <MetricsTable group={group} isEditMode={isEditMode} />, [group, isEditMode]);
  const rowExpansion: DataTableProps<StatsGroup>["rowExpansion"] = {
    trigger: "never",
    expanded: { recordIds: expandedIds },
    content: renderMetrics,
  };
  return (
    <section className={classes.group} aria-label={group.name}>
      <HomarrDataTable<StatsGroup>
        isEditMode={isEditMode}
        height="auto"
        noHeader
        cellPadding="0"
        records={[group]}
        columns={columns}
        rowExpansion={rowExpansion}
      />
    </section>
  );
}

const renderMetric = (record: StatsTableRow) => (
  <div>
    <Text size="xs" c="dimmed" className={classes.metric}>
      {record.metric}
    </Text>
    {record.status && (
      <Text size="xs" c="orange" className={classes.metric}>
        {record.status}
      </Text>
    )}
  </div>
);
const renderValue = (record: StatsTableRow) => (
  <Group justify="flex-end" gap={0}>
    <Text size="sm" fw={600} className={classes.value}>
      {record.value}
    </Text>
  </Group>
);

function MetricsTable({ group, isEditMode }: { group: StatsGroup; isEditMode: boolean }) {
  const t = useI18n("widget.stats");
  return (
    <HomarrDataTable<StatsTableRow>
      isEditMode={isEditMode}
      height="auto"
      noHeader
      fz="xs"
      cellPadding="5px 12px"
      records={group.metrics}
      rowCursor="default"
      columns={[
        { accessor: "metric", title: t("metric"), width: 180, render: renderMetric },
        { accessor: "value", title: t("table.value"), width: 110, textAlign: "right", render: renderValue },
      ]}
    />
  );
}
