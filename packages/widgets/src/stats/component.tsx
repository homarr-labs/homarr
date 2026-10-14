"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRequiredBoard } from "@homarr/boards/context";
import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { useDemoReadOnly } from "../demo-read-only";
import { useWidgetRuntimeActions } from "../runtime-hooks";
import { statsEntriesSchema } from "./config";
import { NativeStatsView } from "./native-view";

export default function StatsWidget({
  integrationIds,
  widgetRuntimeRef,
  isEditMode,
  options,
  width,
  displayMode,
  displayScale = 1,
}: WidgetComponentProps<"stats">) {
  const board = useRequiredBoard();
  const demoReadOnly = useDemoReadOnly();
  const advanced = displayMode === "advanced";
  const utils = clientApi.useUtils();
  const [refreshing, setRefreshing] = useState(0);
  const refreshErrors = useRef(new Map<string, number | null>());
  const [localTable, setLocalTable] = useState<boolean>();
  const table = advanced || (localTable ?? options.table);
  const [localRows, setLocalRows] = useState<boolean>();
  const [localPlain, setPlain] = useState<boolean>();
  const [compact, setCompact] = useState<boolean>();
  const [hidden, setHidden] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
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
          refetchInterval: demoReadOnly ? false : 60_000,
          refetchOnWindowFocus: !demoReadOnly,
          refetchIntervalInBackground: false,
          retry: false,
        },
      ),
    ),
  );

  const hasRefreshError = (integrationId: string) => {
    const failedSnapshotAt = refreshErrors.current.get(integrationId);
    if (failedSnapshotAt === undefined) return false;
    const updatedAt = utils.widget.stats.snapshot.getData({ integrationId })?.updatedAt;
    if (updatedAt == null) return true;
    if (failedSnapshotAt === null) return false;
    return updatedAt <= failedSnapshotAt;
  };

  const refresh = useCallback(
    async (integrationId: string, force: boolean) => {
      if (pending.current.has(integrationId)) return;
      if (!force && (retry.current.get(integrationId) ?? 0) > Date.now()) return;
      const previousUpdatedAt = utils.widget.stats.snapshot.getData({ integrationId })?.updatedAt ?? null;
      pending.current.add(integrationId);
      refreshErrors.current.delete(integrationId);
      setRefreshing((value) => value + 1);
      try {
        const result = await utils.client.widget.stats.refresh.mutate({ integrationId, force });
        await utils.widget.stats.snapshot.cancel({ integrationId });
        utils.widget.stats.snapshot.setData({ integrationId }, result);
        retry.current.set(integrationId, Date.now() + 60_000);
      } catch {
        refreshErrors.current.set(integrationId, previousUpdatedAt);
        retry.current.set(integrationId, Date.now() + 60_000);
        await utils.widget.stats.snapshot.invalidate({ integrationId });
      } finally {
        pending.current.delete(integrationId);
        setRefreshing((value) => value - 1);
      }
    },
    [utils],
  );

  const refreshSources = async () => {
    await Promise.all(visibleIds.map((id) => refresh(id, true)));
  };
  useWidgetRuntimeActions(widgetRuntimeRef, {
    refresh: refreshSources,
    getDataStatus: () => {
      const currentSnapshots = visibleIds.map((integrationId) =>
        utils.widget.stats.snapshot.getData({ integrationId }),
      );
      const timestamps = currentSnapshots.flatMap((snapshot) => {
        if (snapshot?.updatedAt == null) return [];
        return [snapshot.updatedAt];
      });
      let updatedAt: number | null = null;
      if (timestamps.length > 0) updatedAt = Math.min(...timestamps);
      return {
        updatedAt,
        hasError:
          visibleIds.some(hasRefreshError) ||
          currentSnapshots.some((snapshot) => !!snapshot?.error) ||
          snapshots.some((snapshot) => !!snapshot.error),
        isRefreshing: pending.current.size > 0,
      };
    },
  });

  useEffect(() => {
    if (demoReadOnly || document.hidden) return;
    for (const [index, integrationId] of visibleIds.entries()) {
      const snapshot = snapshots[index];
      if (!snapshot?.data || snapshot.error) continue;
      if (snapshot.data.updatedAt === null && snapshot.data.retryAt <= Date.now()) void refresh(integrationId, false);
    }
  }, [demoReadOnly, visibleIds, snapshots, refresh]);

  return (
    <NativeStatsView
      options={options}
      width={width}
      displayMode={displayMode}
      displayScale={displayScale}
      isEditMode={isEditMode}
      itemRadius={board.itemRadius}
      table={table}
      rows={rows}
      plain={plain}
      compact={compact}
      entries={entries}
      orderedEntries={orderedEntries}
      visibleEntries={visibleEntries}
      ids={ids}
      visibleIds={visibleIds}
      catalogs={catalogs}
      snapshots={snapshots}
      refreshing={refreshing}
      hasRefreshError={hasRefreshError}
      refreshSources={refreshSources}
      hidden={hidden}
      setLocalTable={setLocalTable}
      setLocalRows={setLocalRows}
      setPlain={setPlain}
      setCompact={setCompact}
      setHidden={setHidden}
      setOrder={setOrder}
    />
  );
}
