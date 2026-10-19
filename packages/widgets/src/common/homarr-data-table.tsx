"use client";

import "./homarr-data-table.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn, DataTableProps } from "mantine-datatable";
import { DataTable } from "mantine-datatable";

import { scrollAreaDefaultProps } from "@homarr/ui";

const fallbackColumnWidth = 60;

const getColumnWidth = (width: string | number | undefined): number => {
  if (typeof width === "number" && Number.isFinite(width) && width > 0) return width;
  if (typeof width === "string") {
    const parsedWidth = Number.parseFloat(width);
    if (Number.isFinite(parsedWidth) && parsedWidth > 0) return parsedWidth;
  }
  return fallbackColumnWidth;
};

type HomarrDataTableProps<T> = DataTableProps<T> & {
  columns: DataTableColumn<T>[];
  groups?: never;
  isEditMode: boolean;
  cellPadding: string;
  rowCursor?: "auto" | "default";
  preserveColumnWidths?: boolean;
  fillColumnAccessor?: string;
  defaultColumnWidths?: readonly Pick<DataTableColumn<T>, "accessor" | "width">[];
  onColumnWidthsChange?: (widths: { accessor: string; width: number }[]) => void;
};

export function HomarrDataTable<T>({
  isEditMode,
  cellPadding,
  rowCursor = "auto",
  preserveColumnWidths = false,
  fillColumnAccessor,
  defaultColumnWidths,
  onColumnWidthsChange,
  className,
  columns,
  defaultColumnProps,
  onMouseDownCapture,
  scrollAreaProps,
  style,
  ...props
}: HomarrDataTableProps<T>) {
  const [resizePreviewWidths, setResizePreviewWidths] = useState<Record<string, number>>();
  const removeResizeListeners = useRef<() => void>(() => undefined);
  const internalScrollViewportRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = props.scrollViewportRef ?? internalScrollViewportRef;
  useEffect(() => () => removeResizeListeners.current(), []);

  const handleMouseDownCapture = useCallback(
    (event: React.MouseEvent<HTMLTableElement>) => {
      onMouseDownCapture?.(event);
      const target = event.target;
      if (!(target instanceof Element)) return;

      const handle = target.closest(".mantine-datatable-header-resizable-handle");
      const currentCell = handle?.closest<HTMLTableCellElement>("th[data-accessor]");
      const headerRow = currentCell?.parentElement;
      if (!currentCell || !headerRow) return;

      const cells = Array.from(headerRow.querySelectorAll<HTMLTableCellElement>("th[data-accessor]"));
      const currentIndex = cells.indexOf(currentCell);
      const nextCell = cells[currentIndex + 1];
      const currentAccessor = currentCell.dataset.accessor;
      const nextAccessor = nextCell?.dataset.accessor;
      if (!nextCell || !currentAccessor || !nextAccessor) return;

      const widths = Object.fromEntries(
        cells.flatMap((cell) => {
          const accessor = cell.dataset.accessor;
          if (!accessor) return [];
          return [[accessor, cell.getBoundingClientRect().width]];
        }),
      );
      const currentWidth = widths[currentAccessor];
      const nextWidth = widths[nextAccessor];
      if (currentWidth === undefined || nextWidth === undefined) return;

      const visualScale = currentCell.getBoundingClientRect().width / currentCell.offsetWidth;
      let currentMinimumWidth = fallbackColumnWidth * visualScale;
      let nextMinimumWidth = currentMinimumWidth;
      const startX = event.clientX;

      removeResizeListeners.current();
      const usesDisplayedWidths = Boolean(
        preserveColumnWidths &&
        fillColumnAccessor &&
        onColumnWidthsChange &&
        columns.some(({ accessor, hidden }) => !hidden && String(accessor) === fillColumnAccessor),
      );
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;
      if (usesDisplayedWidths) {
        // Fill widths use displayed pixels; original widths keep compact columns resizable.
        currentMinimumWidth = getColumnWidth(
          defaultColumnWidths?.find(({ accessor }) => String(accessor) === currentAccessor)?.width,
        );
        nextMinimumWidth = getColumnWidth(
          defaultColumnWidths?.find(({ accessor }) => String(accessor) === nextAccessor)?.width,
        );
        if (currentAccessor !== fillColumnAccessor)
          currentMinimumWidth = Math.min(fallbackColumnWidth, currentMinimumWidth);
        if (nextAccessor !== fillColumnAccessor) nextMinimumWidth = Math.min(fallbackColumnWidth, nextMinimumWidth);
        const viewport = scrollViewportRef.current;
        if (
          (currentAccessor === fillColumnAccessor || nextAccessor === fillColumnAccessor) &&
          viewport &&
          viewport.scrollWidth > viewport.clientWidth
        ) {
          // An overflowing table leaves no spare width for its fill column.
          currentMinimumWidth = currentWidth;
          nextMinimumWidth = nextWidth;
        }
        // The native resize handler saves logical widths; fill mode stores displayed pixels.
        event.preventDefault();
        event.stopPropagation();
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }
      let previewWidths: Record<string, number> | undefined;
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = Math.min(
          nextWidth - nextMinimumWidth,
          Math.max(currentMinimumWidth - currentWidth, moveEvent.clientX - startX),
        );
        previewWidths = {
          ...widths,
          [currentAccessor]: currentWidth + delta,
          [nextAccessor]: nextWidth - delta,
        };
        setResizePreviewWidths(previewWidths);
      };
      const handleResizeEnd = (endEvent: Event) => {
        removeResizeListeners.current();
        if (usesDisplayedWidths && previewWidths && endEvent.type === "mouseup") {
          const resizedWidths = [currentAccessor, nextAccessor].flatMap((accessor) => {
            const width = previewWidths?.[accessor];
            if (accessor === fillColumnAccessor || width === undefined) return [];
            return [{ accessor, width }];
          });
          if (resizedWidths.length > 0) onColumnWidthsChange?.(resizedWidths);
        }
        requestAnimationFrame(() => requestAnimationFrame(() => setResizePreviewWidths(undefined)));
      };
      removeResizeListeners.current = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleResizeEnd);
        window.removeEventListener("blur", handleResizeEnd);
        if (usesDisplayedWidths) {
          document.body.style.cursor = previousCursor;
          document.body.style.userSelect = previousUserSelect;
        }
        removeResizeListeners.current = () => undefined;
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleResizeEnd);
      window.addEventListener("blur", handleResizeEnd);
    },
    [
      columns,
      defaultColumnWidths,
      fillColumnAccessor,
      onColumnWidthsChange,
      onMouseDownCapture,
      preserveColumnWidths,
      scrollViewportRef,
    ],
  );

  const mergedClassName = [
    "homarr-data-table",
    rowCursor === "default" ? "homarr-data-table-row-cursor-default" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const fittedColumns = useMemo(() => {
    const visibleColumns = columns.filter(({ hidden }) => !hidden);
    const getRenderedWidth = (column: DataTableColumn<T>) =>
      resizePreviewWidths?.[String(column.accessor)] ?? getColumnWidth(column.width);
    const totalWidth = visibleColumns.reduce((total, column) => total + getRenderedWidth(column), 0);
    if (totalWidth <= 0) return columns;

    return columns.map((column) => {
      if (column.hidden) return column;

      let width = `${(getRenderedWidth(column) / totalWidth) * 100}%`;
      if (
        preserveColumnWidths &&
        fillColumnAccessor &&
        visibleColumns.some(({ accessor }) => String(accessor) === fillColumnAccessor)
      ) {
        const renderedWidth = getRenderedWidth(column);
        const inverseScale = "var(--board-canvas-inverse-scale, 1)";
        width = `calc(${renderedWidth}px * ${inverseScale})`;
        if (String(column.accessor) === fillColumnAccessor) {
          width = `calc(100% - ${totalWidth - renderedWidth}px * ${inverseScale})`;
        }
      }
      const fittedWidth = { width, minWidth: width, maxWidth: width };
      const cellsStyle = column.cellsStyle ?? defaultColumnProps?.cellsStyle;
      return {
        ...column,
        titleStyle: [column.titleStyle, fittedWidth],
        cellsStyle: (record: T, index: number) => [cellsStyle?.(record, index), fittedWidth, { padding: cellPadding }],
      };
    });
  }, [
    cellPadding,
    columns,
    defaultColumnProps?.cellsStyle,
    fillColumnAccessor,
    preserveColumnWidths,
    resizePreviewWidths,
  ]);

  const minimumTableWidth = useMemo(() => {
    if (!preserveColumnWidths) return undefined;
    const totalWidth = columns
      .filter(({ hidden }) => !hidden)
      .reduce((total, column) => {
        if (String(column.accessor) === fillColumnAccessor) {
          // Saved fill widths may include spare space from a wider board.
          const defaultWidth = defaultColumnWidths?.find(({ accessor }) => accessor === column.accessor)?.width;
          return total + getColumnWidth(defaultWidth);
        }
        return total + getColumnWidth(column.width);
      }, 0);
    // Keep the minimum readable in displayed pixels when the board canvas is zoomed.
    return `calc(${totalWidth}px * var(--board-canvas-inverse-scale, 1))`;
  }, [columns, defaultColumnWidths, fillColumnAccessor, preserveColumnWidths]);

  return (
    <DataTable<T>
      withTableBorder={false}
      borderRadius={0}
      highlightOnHover
      highlightOnHoverColor={{ dark: "dark.5", light: "gray.1" }}
      verticalAlign="center"
      loaderBackgroundBlur={2}
      textSelectionDisabled
      height="100%"
      {...props}
      scrollViewportRef={scrollViewportRef}
      striped={false}
      columns={fittedColumns}
      onMouseDownCapture={handleMouseDownCapture}
      className={mergedClassName}
      style={[{ pointerEvents: isEditMode ? "none" : undefined, "--homarr-table-min-width": minimumTableWidth }, style]}
      defaultColumnProps={{
        ...defaultColumnProps,
        noWrap: defaultColumnProps?.noWrap ?? true,
        draggable: true,
        resizable: true,
        cellsStyle: defaultColumnProps?.cellsStyle ?? (() => ({ padding: cellPadding })),
      }}
      scrollAreaProps={{ ...scrollAreaDefaultProps, ...scrollAreaProps }}
    />
  );
}
