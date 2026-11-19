"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "mantine-datatable";
import { useDataTableColumns } from "mantine-datatable";

import { isRecord } from "@homarr/common";

interface TableLayoutOptions extends Record<string, unknown> {
  columnOrder?: string;
  columnWidths?: string;
}

export type TableLayoutChange = "columnOrder" | "columnWidths";

interface PendingTableLayout {
  changes: Set<TableLayoutChange>;
  layout: TableLayoutOptions;
  onLayoutChange: (layout: TableLayoutOptions) => void;
  storeKey: string;
}

interface UseTableLayoutPersistenceProps {
  boardId: string | undefined;
  hasChangeAccess: boolean;
  itemId: string | undefined;
  saveItemOptions: (input: { boardId: string; itemId: string; newOptions: TableLayoutOptions }) => void;
  setOptions: (input: { newOptions: TableLayoutOptions }) => void;
}

interface UsePersistedTableLayoutProps<T> {
  columns: DataTableColumn<T>[];
  columnAccessors: readonly string[];
  columnOrder: string;
  columnWidths: string;
  itemId: string | undefined;
  storeKeyPrefix: string;
  onLayoutChange: (layout: TableLayoutOptions) => void;
}

const layoutSaveDelay = 350;

export const useTableLayoutPersistence = ({
  boardId,
  hasChangeAccess,
  itemId,
  saveItemOptions,
  setOptions,
}: UseTableLayoutPersistenceProps) =>
  useCallback(
    (newOptions: TableLayoutOptions) => {
      setOptions({ newOptions });
      if (hasChangeAccess && boardId && itemId) saveItemOptions({ boardId, itemId, newOptions });
    },
    [boardId, hasChangeAccess, itemId, saveItemOptions, setOptions],
  );

const toPixelWidth = (width: string | number | undefined): number | undefined => {
  if (typeof width === "number" && Number.isFinite(width) && width > 0) return width;
  if (typeof width !== "string" || !width.endsWith("px")) return undefined;

  const parsedWidth = Number.parseFloat(width);
  return Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : undefined;
};

const normalizeWidth = (width: string | number | undefined) => toPixelWidth(width) ?? width ?? "auto";

export const parseColumnOrder = (value: string, columnAccessors: readonly string[]): string[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const allowed = new Set(columnAccessors);
    return parsed.filter(
      (accessor, index): accessor is string =>
        typeof accessor === "string" && allowed.has(accessor) && parsed.indexOf(accessor) === index,
    );
  } catch {
    return [];
  }
};

export const parseColumnWidths = (value: string, columnAccessors: readonly string[]): Record<string, number> => {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return {};

    const allowed = new Set(columnAccessors);
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          allowed.has(entry[0]) && typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] > 0,
      ),
    );
  } catch {
    return {};
  }
};

export const usePersistedTableLayout = <T>({
  columns,
  columnAccessors,
  columnOrder,
  columnWidths,
  itemId,
  storeKeyPrefix,
  onLayoutChange,
}: UsePersistedTableLayoutProps<T>) => {
  const savedOrder = useMemo(() => parseColumnOrder(columnOrder, columnAccessors), [columnAccessors, columnOrder]);
  const savedWidths = useMemo(() => parseColumnWidths(columnWidths, columnAccessors), [columnAccessors, columnWidths]);
  const visibleAccessors = useMemo(() => columns.map(({ accessor }) => String(accessor)), [columns]);
  const visibleAccessorSet = useMemo(() => new Set(visibleAccessors), [visibleAccessors]);
  const restoredOrder = useMemo(
    () => [
      ...savedOrder.filter((accessor) => visibleAccessorSet.has(accessor)),
      ...visibleAccessors.filter((accessor) => !savedOrder.includes(accessor)),
    ],
    [savedOrder, visibleAccessors, visibleAccessorSet],
  );
  const storeKey = `${storeKeyPrefix}-${itemId ?? "preview"}-${[...visibleAccessors].toSorted().join(",")}`;
  const savedColumns = useMemo(
    () =>
      restoredOrder.flatMap((accessor) => {
        const column = columns.find((candidate) => String(candidate.accessor) === accessor);
        if (!column) return [];
        const width = savedWidths[accessor];
        if (width === undefined) return [column];
        return [{ ...column, width }];
      }),
    [columns, restoredOrder, savedWidths],
  );
  const { effectiveColumns, columnsOrder, columnsWidth, setColumnsOrder, setMultipleColumnWidths } =
    useDataTableColumns<T>({ key: storeKey, columns: savedColumns });
  const currentWidths = useMemo<Record<string, string | number>>(
    () => Object.fromEntries(columnsWidth.flatMap((entry) => Object.entries(entry))),
    [columnsWidth],
  );
  const layoutKey = JSON.stringify([storeKey, columnOrder, columnWidths]);
  const restoringLayoutKey = useRef<string | undefined>(undefined);
  const [syncedLayoutKey, setSyncedLayoutKey] = useState<string>();
  useEffect(() => {
    const widths = savedColumns.map(({ accessor, width }) => ({ accessor: String(accessor), width: width ?? "auto" }));
    if (restoringLayoutKey.current !== layoutKey) {
      restoringLayoutKey.current = layoutKey;
      setSyncedLayoutKey(undefined);
      setColumnsOrder(restoredOrder);
      setMultipleColumnWidths(widths);
      return;
    }
    if (syncedLayoutKey === layoutKey) return;

    const orderMatches =
      columnsOrder.length === restoredOrder.length &&
      columnsOrder.every((accessor, index) => accessor === restoredOrder[index]);
    const widthsMatch = widths.every(
      ({ accessor, width }) => normalizeWidth(currentWidths[accessor]) === normalizeWidth(width),
    );

    if (orderMatches && widthsMatch) {
      setSyncedLayoutKey(layoutKey);
      return;
    }

    if (!orderMatches) setColumnsOrder(restoredOrder);
    if (!widthsMatch) setMultipleColumnWidths(widths);
  }, [
    columnsOrder,
    currentWidths,
    layoutKey,
    restoredOrder,
    savedColumns,
    setColumnsOrder,
    setMultipleColumnWidths,
    syncedLayoutKey,
  ]);

  const layout = useMemo(() => {
    const newLayout: TableLayoutOptions = {};
    const fullOrder = [...savedOrder, ...columnAccessors.filter((accessor) => !savedOrder.includes(accessor))];
    const reorderedVisibleColumns = [...columnsOrder];
    const mergedOrder = fullOrder.map((accessor) =>
      visibleAccessorSet.has(accessor) ? (reorderedVisibleColumns.shift() ?? accessor) : accessor,
    );
    if (JSON.stringify(mergedOrder) !== JSON.stringify(fullOrder)) newLayout.columnOrder = JSON.stringify(mergedOrder);

    const widthMap: Record<string, number> = { ...savedWidths };
    let widthsChanged = false;
    for (const column of columns) {
      const accessor = String(column.accessor);
      const width = toPixelWidth(currentWidths[accessor]);
      const defaultWidth = toPixelWidth(column.width);
      if ((width ?? defaultWidth) !== (savedWidths[accessor] ?? defaultWidth)) widthsChanged = true;
      if (width === undefined) delete widthMap[accessor];
      else widthMap[accessor] = width;
    }
    if (widthsChanged) newLayout.columnWidths = JSON.stringify(widthMap);
    return newLayout;
  }, [columnAccessors, columns, columnsOrder, currentWidths, savedOrder, savedWidths, visibleAccessorSet]);

  const pendingLayout = useRef<PendingTableLayout | undefined>(undefined);
  const saveTimeout = useRef<number | undefined>(undefined);
  const flushPendingLayout = useCallback(() => {
    const pending = pendingLayout.current;
    pendingLayout.current = undefined;
    window.clearTimeout(saveTimeout.current);
    saveTimeout.current = undefined;
    if (pending && Object.keys(pending.layout).length > 0) pending.onLayoutChange(pending.layout);
  }, []);
  useEffect(() => {
    if (pendingLayout.current && pendingLayout.current.storeKey !== storeKey) flushPendingLayout();
  }, [flushPendingLayout, storeKey]);
  useEffect(() => () => flushPendingLayout(), [flushPendingLayout]);
  const updatePendingLayout = useCallback(() => {
    const pending = pendingLayout.current;
    if (!pending || pending.storeKey !== storeKey) return;
    const nextLayout: TableLayoutOptions = {};
    for (const change of pending.changes) {
      const value = layout[change];
      if (value !== undefined) nextLayout[change] = value;
    }
    pending.layout = nextLayout;
  }, [layout, storeKey]);
  useEffect(updatePendingLayout, [updatePendingLayout]);
  const onColumnLayoutChange = useCallback(
    (change: TableLayoutChange) => {
      if (pendingLayout.current && pendingLayout.current.storeKey !== storeKey) flushPendingLayout();
      pendingLayout.current ??= { changes: new Set(), layout: {}, onLayoutChange, storeKey };
      pendingLayout.current.changes.add(change);
      updatePendingLayout();
      window.clearTimeout(saveTimeout.current);
      saveTimeout.current = window.setTimeout(flushPendingLayout, layoutSaveDelay);
    },
    [flushPendingLayout, onLayoutChange, storeKey, updatePendingLayout],
  );

  if (syncedLayoutKey !== layoutKey)
    return { effectiveColumns: savedColumns, storeKey, onColumnLayoutChange, setMultipleColumnWidths };
  return { effectiveColumns, storeKey, onColumnLayoutChange, setMultipleColumnWidths };
};
