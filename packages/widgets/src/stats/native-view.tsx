"use client";

import type { CSSProperties, Dispatch, SetStateAction } from "react";
import { useState } from "react";
import {
  ActionIcon,
  Avatar,
  Button,
  Checkbox,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconRefresh, IconAdjustments } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import type { StatsEntry } from "./config";
import { StatsTable } from "./table";
import type { StatsTableRow } from "./table";
import { StatsDetails } from "./details";
import type { StatsCatalog, StatsSnapshot } from "./details";
import { formatStatsValue } from "./format";
import { StatsLoading } from "./loading";
import classes from "./stats.module.css";

export interface NativeStatsViewProps {
  options: WidgetComponentProps<"stats">["options"];
  width: number;
  displayMode: WidgetComponentProps<"stats">["displayMode"];
  displayScale?: number;
  isEditMode: boolean;
  itemRadius: string;
  table: boolean;
  rows: boolean;
  plain: boolean;
  compact: boolean | undefined;
  entries: StatsEntry[];
  orderedEntries: StatsEntry[];
  visibleEntries: StatsEntry[];
  ids: string[];
  visibleIds: string[];
  catalogs: readonly { data?: StatsCatalog; error?: unknown }[];
  snapshots: readonly { data?: StatsSnapshot; error?: unknown }[];
  refreshing: number;
  hasRefreshError: (integrationId: string) => boolean;
  refreshSources: () => Promise<void>;
  hidden: string[];
  setLocalTable: Dispatch<SetStateAction<boolean | undefined>>;
  setLocalRows: Dispatch<SetStateAction<boolean | undefined>>;
  setPlain: Dispatch<SetStateAction<boolean | undefined>>;
  setCompact: Dispatch<SetStateAction<boolean | undefined>>;
  setHidden: Dispatch<SetStateAction<string[]>>;
  setOrder: Dispatch<SetStateAction<string[]>>;
}

export function NativeStatsView({
  isEditMode,
  options,
  width,
  displayMode,
  displayScale = 1,
  itemRadius,
  table,
  rows,
  plain,
  compact,
  entries,
  orderedEntries,
  visibleEntries,
  ids,
  visibleIds,
  catalogs,
  snapshots,
  refreshing,
  hasRefreshError,
  refreshSources,
  hidden,
  setLocalTable,
  setLocalRows,
  setPlain,
  setCompact,
  setHidden,
  setOrder,
}: NativeStatsViewProps) {
  const advanced = displayMode === "advanced";
  const t = useI18n("widget.stats");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const tableEntries = advanced
    ? ids.flatMap((id) => {
        const catalog = catalogs[ids.indexOf(id)]?.data;
        if (!catalog) return [{ id, integrationId: id, metric: "", label: "", compact: false }];
        return catalog.metrics.map((metric) => ({
          id: `${id}:${metric.key}`,
          integrationId: id,
          metric: metric.key,
          label: metric.label,
          compact: false,
        }));
      })
    : visibleEntries;
  const tableRecords: StatsTableRow[] = tableEntries.map((entry) => {
    const catalog = catalogs[ids.indexOf(entry.integrationId)];
    const snapshot = snapshots[visibleIds.indexOf(entry.integrationId)];
    const metric = catalog?.data?.metrics.find((item) => item.key === entry.metric);
    const refreshFailed = !!snapshot?.error || hasRefreshError(entry.integrationId);
    const unavailable =
      !ids.includes(entry.integrationId) ||
      (!!catalog?.error && !catalog.data) ||
      (!!snapshot?.error && !snapshot.data) ||
      (!!catalog?.data && !metric);
    const loading =
      !unavailable && !refreshFailed && !snapshot?.data?.error && (snapshot?.data?.updatedAt == null || !metric);
    let value = "—";
    let status = "";
    if (snapshot?.data && metric)
      value = formatStatsValue(snapshot.data.values[entry.metric], metric.unit, compact ?? entry.compact);
    if (refreshFailed) status = t("refreshFailed");
    if (snapshot?.data?.error) status = t("refreshFailed");
    if ((refreshFailed || snapshot?.data?.error) && snapshot?.data?.updatedAt == null) status = t("fetchFailed");
    if (unavailable) {
      value = t("unavailable");
      status = t("unavailable");
    }
    return {
      id: entry.id,
      integrationId: entry.integrationId,
      source: catalog?.data?.name ?? "",
      iconUrl: catalog?.data?.iconUrl,
      metric: entry.label || metric?.label || entry.metric,
      value,
      status,
      loading,
    };
  });

  let physicalWidth = width;
  if (!advanced && Number.isFinite(displayScale) && displayScale > 0) physicalWidth *= displayScale;
  let minimumWidth = 150;
  if (rows) minimumWidth = 200;
  if (advanced) minimumWidth = 280;
  let itemCount = visibleEntries.length;
  if (advanced) itemCount = ids.length;
  const columns = Math.max(1, Math.min(itemCount, Math.floor(physicalWidth / minimumWidth)));
  let gap = 8;
  if (options.spacing === "sm") gap = 12;
  if (options.spacing === "md") gap = 16;
  const rootStyle: CSSProperties & { "--stats-radius": string } = {
    "--stats-radius": `var(--mantine-radius-${itemRadius})`,
  };
  if (!advanced && displayScale > 1) {
    Object.assign(rootStyle, { "--mantine-scale": 1 / displayScale, "--board-canvas-ui-scale": 1 / displayScale });
  }

  return (
    <div
      className={classes.root}
      data-advanced={advanced || undefined}
      data-table={table || undefined}
      data-rows={rows || undefined}
      data-plain={plain || undefined}
      style={rootStyle}
    >
      <div className={classes.toolbar}>
        <Popover opened={settingsOpen} onChange={setSettingsOpen} position="top-end" width={300} withinPortal trapFocus>
          <Popover.Target>
            <ActionIcon
              variant="default"
              size="sm"
              radius="xl"
              aria-label={t("viewOptions")}
              onClick={() => setSettingsOpen((value) => !value)}
            >
              <IconAdjustments size={13} />
            </ActionIcon>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="sm">
              <Text size="sm" fw={600}>
                {t("viewOptions")}
              </Text>
              <Text size="xs" c="dimmed">
                {t("localHelp")}
              </Text>
              {!advanced && (
                <Switch
                  label={t("option.table.label")}
                  checked={table}
                  onChange={(event) => setLocalTable(event.currentTarget.checked)}
                />
              )}
              <Switch
                disabled={table}
                label={t("option.rows.label")}
                checked={rows}
                onChange={(event) => setLocalRows(event.currentTarget.checked)}
              />
              <Switch
                disabled={table}
                label={t("plain")}
                checked={plain}
                onChange={(event) => setPlain(event.currentTarget.checked)}
              />
              <Switch
                label={t("compact")}
                checked={compact ?? (!advanced && entries.every((entry) => entry.compact))}
                onChange={(event) => setCompact(event.currentTarget.checked)}
              />
              {!advanced && (
                <ScrollArea.Autosize mah={240}>
                  <Stack gap={8}>
                    {orderedEntries
                      .filter((entry) => !entry.hidden)
                      .map((entry, index, displayed) => {
                        const catalog = catalogs[ids.indexOf(entry.integrationId)]?.data;
                        const label =
                          entry.label ||
                          catalog?.metrics.find((item) => item.key === entry.metric)?.label ||
                          entry.metric;
                        const move = (delta: number) => {
                          const next = [...orderedEntries];
                          const currentIndex = next.findIndex((item) => item.id === entry.id);
                          const neighbor = displayed[index + delta];
                          if (!neighbor) return;
                          const targetIndex = next.findIndex((item) => item.id === neighbor.id);
                          next.splice(currentIndex, 1);
                          next.splice(targetIndex, 0, entry);
                          setOrder(next.map((item) => item.id));
                        };
                        return (
                          <Group key={entry.id} gap={6} wrap="nowrap">
                            <Checkbox
                              style={{ flex: 1 }}
                              size="xs"
                              label={label}
                              checked={!hidden.includes(entry.id)}
                              onChange={(event) => {
                                if (event.currentTarget.checked)
                                  setHidden((values) => values.filter((id) => id !== entry.id));
                                else setHidden((values) => [...values, entry.id]);
                              }}
                            />
                            <ActionIcon
                              variant="subtle"
                              size="xs"
                              aria-label={`${t("moveUp")}: ${label}`}
                              disabled={index === 0}
                              onClick={() => move(-1)}
                            >
                              <IconArrowUp size={12} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              size="xs"
                              aria-label={`${t("moveDown")}: ${label}`}
                              disabled={index === displayed.length - 1}
                              onClick={() => move(1)}
                            >
                              <IconArrowDown size={12} />
                            </ActionIcon>
                          </Group>
                        );
                      })}
                  </Stack>
                </ScrollArea.Autosize>
              )}
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setLocalTable(undefined);
                  setLocalRows(undefined);
                  setPlain(undefined);
                  setCompact(undefined);
                  setHidden([]);
                  setOrder([]);
                }}
              >
                {t("resetView")}
              </Button>
            </Stack>
          </Popover.Dropdown>
        </Popover>
        <Tooltip label={t("refresh")} events={{ hover: true, focus: true, touch: true }}>
          <ActionIcon
            variant="default"
            size="sm"
            radius="xl"
            aria-label={t("refresh")}
            loading={refreshing > 0}
            onClick={() => void refreshSources()}
          >
            <IconRefresh size={13} />
          </ActionIcon>
        </Tooltip>
      </div>
      {!table && visibleEntries.length === 0 && (
        <Text size="xs" c="dimmed" ta="center" p="md">
          {entries.length > 0 ? t("allHidden") : t("empty")}
        </Text>
      )}
      {table && <StatsTable records={tableRecords} showIcon={options.showIcon} isEditMode={isEditMode} />}
      {!table && (
        <ScrollArea h="100%" type="hover" offsetScrollbars>
          <div className={classes.grid} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap }}>
            {!advanced &&
              visibleEntries.map((entry) => {
                const catalog = catalogs[ids.indexOf(entry.integrationId)];
                const snapshot = snapshots[visibleIds.indexOf(entry.integrationId)];
                const metric = catalog?.data?.metrics.find((item) => item.key === entry.metric);
                const refreshFailed = !!snapshot?.error || hasRefreshError(entry.integrationId);
                const unavailable =
                  !ids.includes(entry.integrationId) ||
                  (!!catalog?.error && !catalog.data) ||
                  (!!snapshot?.error && !snapshot.data);
                const loading =
                  !unavailable &&
                  !(catalog?.data && !metric) &&
                  !refreshFailed &&
                  !snapshot?.data?.error &&
                  (snapshot?.data?.updatedAt == null || !metric);
                let value = "—";
                if (unavailable || (catalog?.data && !metric)) value = t("unavailable");
                else if (snapshot?.data && metric)
                  value = formatStatsValue(snapshot.data.values[entry.metric], metric.unit, compact ?? entry.compact);
                const label = entry.label || metric?.label || entry.metric;
                const sourceName = catalog?.data?.name ?? "";
                let accessibleValue = value;
                if (loading) accessibleValue = t("loading");
                let loaderSize = 26;
                if (rows) loaderSize = 18;
                let loaderIcon: string | undefined;
                if (options.showIcon) loaderIcon = catalog?.data?.iconUrl;
                let status = "";
                if (refreshFailed) status = t("refreshFailed");
                if (snapshot?.data?.error) status = t("refreshFailed");
                if ((refreshFailed || snapshot?.data?.error) && snapshot?.data?.updatedAt == null)
                  status = t("fetchFailed");
                if (unavailable) status = t("unavailable");
                return (
                  <Popover
                    key={entry.id}
                    opened={detailsId === entry.id}
                    onChange={(opened) => {
                      if (!opened) setDetailsId(null);
                    }}
                    withArrow
                    width="min(360px, calc(100vw - 32px))"
                    withinPortal
                    trapFocus
                  >
                    <Popover.Target>
                      <button
                        type="button"
                        className={classes.card}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDetailsId((current) => {
                            if (current === entry.id) return null;
                            return entry.id;
                          });
                        }}
                        aria-label={`${label}: ${accessibleValue}. ${sourceName}. ${status}`}
                        aria-busy={loading}
                      >
                        {options.showIcon && catalog?.data && !loading && (
                          <Avatar
                            className={classes.icon}
                            src={catalog.data.iconUrl}
                            size={12}
                            radius={3}
                            alt={sourceName}
                            name={sourceName}
                            imageProps={{ referrerPolicy: "no-referrer" }}
                            styles={{ image: { objectFit: "contain" } }}
                          />
                        )}
                        <div className={classes.main}>
                          <Text component="div" className={classes.value}>
                            {loading && <StatsLoading iconUrl={loaderIcon} source={sourceName} size={loaderSize} />}
                            {!loading && value}
                          </Text>
                          <Text className={classes.label} lineClamp={2}>
                            {label}
                          </Text>
                        </div>
                      </button>
                    </Popover.Target>
                    <Popover.Dropdown className={classes.details} onClick={(event) => event.stopPropagation()}>
                      {catalog?.data && (
                        <StatsDetails
                          catalog={catalog.data}
                          snapshot={snapshot?.data}
                          selected={entry.metric}
                          showIcon={options.showIcon}
                          unavailable={unavailable}
                          refreshFailed={refreshFailed}
                        />
                      )}
                      {!catalog?.data && unavailable && t("unavailable")}
                      {!catalog?.data && !unavailable && <StatsLoading />}
                    </Popover.Dropdown>
                  </Popover>
                );
              })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
