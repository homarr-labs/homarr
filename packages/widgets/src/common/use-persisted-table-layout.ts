"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DataTableColumn } from "mantine-datatable";
import { useDataTableColumns } from "mantine-datatable";

interface TableLayoutOptions {
  columnOrder?: string;
  columnWidths?: string;
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
  useEffect(() => {
    if (lastStoreKey.current !== storeKey) {
      lastStoreKey.current = storeKey;
      hydrated.current = false;
    }
    if (hydrated.current) return;

    if (restoredOrder.length > 0) setColumnsOrder(restoredOrder);
    const visibleWidths = Object.entries(savedWidths)
      .filter(([accessor]) => visibleAccessorSet.has(accessor))
      .map(([accessor, width]) => ({ accessor, width }));
    if (visibleWidths.length > 0) setMultipleColumnWidths(visibleWidths);

    const animationFrame = requestAnimationFrame(() => {
      hydrated.current = true;
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [restoredOrder, savedWidths, setColumnsOrder, setMultipleColumnWidths, storeKey, visibleAccessorSet]);

  const previousOrder = useRef(columnsOrder);
  const previousWidths = useRef(columnsWidth);
  const pendingLayout = useRef<TableLayoutOptions>({});
  const saveTimeout = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(saveTimeout.current);
    },
    [],
  );
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
      for (const entry of columnsWidth) {
        const accessor = Object.keys(entry)[0];
        if (!accessor || !visibleAccessorSet.has(accessor)) continue;
        const width = entry[accessor];
        if (typeof width === "number" && Number.isFinite(width) && width > 0) {
          widthMap[accessor] = width;
        } else if (typeof width === "string" && width.endsWith("px")) {
          const parsedWidth = Number.parseInt(width, 10);
          if (Number.isFinite(parsedWidth) && parsedWidth > 0) widthMap[accessor] = parsedWidth;
        }
      }
      newLayout.columnWidths = JSON.stringify(widthMap);
    }

    pendingLayout.current = { ...pendingLayout.current, ...newLayout };
    window.clearTimeout(saveTimeout.current);
    saveTimeout.current = window.setTimeout(() => {
      onLayoutChange(pendingLayout.current);
      pendingLayout.current = {};
    }, layoutSaveDelay);
  }, [columnAccessors, columnsOrder, columnsWidth, onLayoutChange, savedOrder, savedWidths, visibleAccessorSet]);

  return { effectiveColumns, storeKey };
};
