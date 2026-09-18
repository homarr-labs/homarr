"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { IconAlertCircle, IconArrowDown, IconArrowUp, IconRefresh, IconAdjustments } from "@tabler/icons-react";

import { useRequiredBoard } from "@homarr/boards/context";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { statsEntriesSchema } from "./config";
import { StatsTable } from "./table";
import type { StatsTableRow } from "./table";
import { StatsDetails } from "./details";
import { formatStatsValue } from "./format";
import classes from "./stats.module.css";

export default function StatsWidget({
  integrationIds,
  isEditMode,
  options,
  width,
  displayMode,
  displayScale = 1,
}: WidgetComponentProps<"stats">) {
  const board = useRequiredBoard();
  const advanced = displayMode === "advanced";
  const t = useI18n("widget.stats");
  const utils = clientApi.useUtils();
  const [refreshing, setRefreshing] = useState(0);
  const [localTable, setLocalTable] = useState<boolean>();
  const table = advanced || (localTable ?? options.table);
  const [localRows, setLocalRows] = useState<boolean>();
  const [localPlain, setPlain] = useState<boolean>();
  const [compact, setCompact] = useState<boolean>();
  const [hidden, setHidden] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const rows = localRows ?? options.rows;
  const plain = localPlain ?? options.plain;
  const pending = useRef(new Set<string>());
  const retry = useRef(new Map<string, number>());
  const entries = statsEntriesSchema.safeParse(options.entries).data ?? [];
  const orderedEntries = entries.toSorted((a, b) => {
    const position = (id: string) => {
      const index = order.indexOf(id);
      if (index >= 0) return index;
      return order.length + entries.findIndex((entry) => entry.id === id);
    };
    return position(a.id) - position(b.id);
  });
  const visibleEntries = orderedEntries.filter((entry) => !entry.hidden && !hidden.includes(entry.id));
  const ids = [...new Set(integrationIds)];
  // Queries are per integration instance, never per metric. Hover and advanced details reuse these snapshots.
  const visibleIds = ids.filter((id) => advanced || visibleEntries.some((entry) => entry.integrationId === id));
  const catalogs = clientApi.useQueries((api) =>
    ids.map((integrationId) => api.widget.stats.catalog({ integrationId }, { staleTime: 60_000, retry: false })),
  );
  const snapshots = clientApi.useQueries((api) =>
    visibleIds.map((integrationId) =>
      api.widget.stats.snapshot(
        { integrationId },
        {
          staleTime: 30_000,
          refetchInterval: 60_000,
          refetchOnWindowFocus: true,
          refetchIntervalInBackground: false,
          retry: false,
        },
      ),
    ),
  );

  const refresh = useCallback(
    async (integrationId: string, force: boolean) => {
      if (pending.current.has(integrationId)) return;
      if (!force && (retry.current.get(integrationId) ?? 0) > Date.now()) return;
      pending.current.add(integrationId);
      setRefreshing((value) => value + 1);
      try {
        const result = await utils.client.widget.stats.refresh.mutate({ integrationId, force });
        utils.widget.stats.snapshot.setData({ integrationId }, result);
        retry.current.set(integrationId, Date.now() + 60_000);
      } catch {
        retry.current.set(integrationId, Date.now() + 60_000);
        await utils.widget.stats.snapshot.invalidate({ integrationId });
      } finally {
        pending.current.delete(integrationId);
        setRefreshing((value) => value - 1);
      }
    },
    [utils],
  );

  useEffect(() => {
    if (document.hidden) return;
    for (const [index, integrationId] of visibleIds.entries()) {
      const snapshot = snapshots[index];
      if (!snapshot?.data || snapshot.error) continue;
      if (snapshot.data.stale && snapshot.data.retryAt <= Date.now()) void refresh(integrationId, false);
    }
  }, [visibleIds, snapshots, refresh]);

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
    const unavailable =
      !ids.includes(entry.integrationId) || !!catalog?.error || !!snapshot?.error || (!!catalog?.data && !metric);
    let value = t("loading");
    let status = "";
    if (snapshot?.data && metric)
      value = formatStatsValue(snapshot.data.values[entry.metric], metric.unit, compact ?? entry.compact);
    if (snapshot?.data?.error) status = t("refreshFailed");
    if (snapshot?.data?.error && snapshot.data.updatedAt === null) status = t("fetchFailed");
    if (unavailable) {
      value = t("unavailable");
      status = t("unavailable");
    }
    return {
      id: entry.id,
      integrationId: entry.integrationId,
      source: catalog?.data?.name ?? t("unavailable"),
      iconUrl: catalog?.data?.iconUrl,
      metric: entry.label || metric?.label || entry.metric,
      value,
      status,
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
  const rootStyle = { "--stats-radius": `var(--mantine-radius-${board.itemRadius})` } as CSSProperties;
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
            onClick={() => {
              for (const id of visibleIds) void refresh(id, true);
            }}
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
                const unavailable = !ids.includes(entry.integrationId) || !!catalog?.error || !!snapshot?.error;
                let value = t("loading");
                if (unavailable || (catalog?.data && !metric)) value = t("unavailable");
                else if (snapshot?.data && metric)
                  value = formatStatsValue(snapshot.data.values[entry.metric], metric.unit, compact ?? entry.compact);
                const label = entry.label || metric?.label || entry.metric;
                const sourceName = catalog?.data?.name ?? t("unavailable");
                let status = "";
                if (snapshot?.data?.stale && snapshot.data.updatedAt !== null) status = t("stale");
                if (snapshot?.data?.error) {
                  status = t("refreshFailed");
                  if (snapshot.data.updatedAt === null) status = t("fetchFailed");
                }
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
                        aria-label={`${label}: ${value}. ${sourceName}. ${status}`}
                      >
                        {options.showIcon && catalog?.data && (
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
                        {status && <IconAlertCircle className={classes.status} size={12} aria-label={status} />}
                        <div className={classes.main}>
                          <Text className={classes.value}>{value}</Text>
                          <Text className={classes.label} lineClamp={2}>
                            {label}
                          </Text>
                        </div>
                      </button>
                    </Popover.Target>
                    <Popover.Dropdown className={classes.details} onClick={(event) => event.stopPropagation()}>
                      {catalog?.data ? (
                        <StatsDetails
                          catalog={catalog.data}
                          snapshot={snapshot?.data}
                          selected={entry.metric}
                          showIcon={options.showIcon}
                          unavailable={unavailable}
                        />
                      ) : (
                        t("unavailable")
                      )}
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
