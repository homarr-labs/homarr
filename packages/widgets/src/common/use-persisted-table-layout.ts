"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DataTableColumn } from "mantine-datatable";
import { useDataTableColumns } from "mantine-datatable";

interface TableLayoutOptions extends Record<string, unknown> {
  columnOrder?: string;
  columnWidths?: string;
}

interface PendingTableLayout {
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

const toPixelWidth = (width: string | number): number | undefined => {
  if (typeof width === "number" && Number.isFinite(width) && width > 0) return width;
  if (typeof width !== "string" || !width.endsWith("px")) return undefined;

  const parsedWidth = Number.parseInt(width, 10);
  return Number.isFinite(parsedWidth) && parsedWidth > 0 ? parsedWidth : undefined;
};

const getColumnWidthMap = (
  columnsWidth: Record<string, string | number>[],
  visibleAccessorSet: ReadonlySet<string>,
): Record<string, number> => {
  const widths: Record<string, number> = {};
  for (const entry of columnsWidth) {
    for (const [accessor, width] of Object.entries(entry)) {
      if (!visibleAccessorSet.has(accessor)) continue;
      const pixelWidth = toPixelWidth(width);
      if (pixelWidth !== undefined) widths[accessor] = pixelWidth;
    }
  }
  return widths;
};

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
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

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
  const { effectiveColumns, columnsOrder, columnsWidth, setColumnsOrder, setMultipleColumnWidths } =
    useDataTableColumns<T>({
      key: storeKey,
      columns,
    });

  const lastStoreKey = useRef(storeKey);
  const hydrated = useRef(false);
  const previousOrder = useRef(columnsOrder);
  const previousWidths = useRef(columnsWidth);
  useEffect(() => {
    if (lastStoreKey.current !== storeKey) {
      lastStoreKey.current = storeKey;
      hydrated.current = false;
    }
    if (hydrated.current) return;

    const orderMatches =
      columnsOrder.length === restoredOrder.length &&
      columnsOrder.every((accessor, index) => accessor === restoredOrder[index]);
    const currentWidths = getColumnWidthMap(columnsWidth, visibleAccessorSet);
    const visibleWidths = Object.entries(savedWidths).filter(([accessor]) => visibleAccessorSet.has(accessor));
    const widthsMatch = visibleWidths.every(([accessor, width]) => currentWidths[accessor] === width);

    if (orderMatches && widthsMatch) {
      previousOrder.current = columnsOrder;
      previousWidths.current = columnsWidth;
      hydrated.current = true;
      return;
    }

    if (!orderMatches) setColumnsOrder(restoredOrder);
    if (!widthsMatch) {
      setMultipleColumnWidths(visibleWidths.map(([accessor, width]) => ({ accessor, width })));
    }
  }, [
    columnsOrder,
    columnsWidth,
    restoredOrder,
    savedWidths,
    setColumnsOrder,
    setMultipleColumnWidths,
    storeKey,
    visibleAccessorSet,
  ]);

  const pendingLayout = useRef<PendingTableLayout | undefined>(undefined);
  const saveTimeout = useRef<number | undefined>(undefined);
  const flushPendingLayout = useCallback(() => {
    const pending = pendingLayout.current;
    pendingLayout.current = undefined;
    window.clearTimeout(saveTimeout.current);
    saveTimeout.current = undefined;
    if (pending) pending.onLayoutChange(pending.layout);
  }, []);
  useEffect(() => {
    if (pendingLayout.current && pendingLayout.current.storeKey !== storeKey) flushPendingLayout();
  }, [flushPendingLayout, storeKey]);
  useEffect(() => () => flushPendingLayout(), [flushPendingLayout]);
  useEffect(() => {
    if (!hydrated.current) return;

    const orderChanged = JSON.stringify(columnsOrder) !== JSON.stringify(previousOrder.current);
    const widthsChanged = JSON.stringify(columnsWidth) !== JSON.stringify(previousWidths.current);
    previousOrder.current = columnsOrder;
    previousWidths.current = columnsWidth;
    if (!orderChanged && !widthsChanged) return;

    const newLayout: TableLayoutOptions = {};
    if (orderChanged) {
      const fullOrder = [...savedOrder, ...columnAccessors.filter((accessor) => !savedOrder.includes(accessor))];
      const reorderedVisibleColumns = [...columnsOrder];
      const mergedOrder = fullOrder.map((accessor) =>
        visibleAccessorSet.has(accessor) ? (reorderedVisibleColumns.shift() ?? accessor) : accessor,
      );
      newLayout.columnOrder = JSON.stringify(mergedOrder);
    }
    if (widthsChanged) {
      const widthMap: Record<string, number> = { ...savedWidths };
      Object.assign(widthMap, getColumnWidthMap(columnsWidth, visibleAccessorSet));
      newLayout.columnWidths = JSON.stringify(widthMap);
    }

    if (pendingLayout.current && pendingLayout.current.storeKey !== storeKey) flushPendingLayout();
    pendingLayout.current = pendingLayout.current
      ? { ...pendingLayout.current, layout: { ...pendingLayout.current.layout, ...newLayout } }
      : { layout: newLayout, onLayoutChange, storeKey };
    window.clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(flushPendingLayout, layoutSaveDelay);
  }, [
    columnAccessors,
    columnsOrder,
    columnsWidth,
    flushPendingLayout,
    onLayoutChange,
    savedOrder,
    savedWidths,
    storeKey,
    visibleAccessorSet,
  ]);

  return { effectiveColumns, storeKey };
};
