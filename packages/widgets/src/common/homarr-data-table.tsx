"use client";

import "./homarr-data-table.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn, DataTableProps } from "mantine-datatable";
import { DataTable } from "mantine-datatable";

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
};

export function HomarrDataTable<T>({
  isEditMode,
  cellPadding,
  rowCursor = "auto",
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
      const minimumWidth = fallbackColumnWidth * visualScale;
      const startX = event.clientX;

      removeResizeListeners.current();
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = Math.min(
          nextWidth - minimumWidth,
          Math.max(minimumWidth - currentWidth, moveEvent.clientX - startX),
        );
        setResizePreviewWidths({
          ...widths,
          [currentAccessor]: currentWidth + delta,
          [nextAccessor]: nextWidth - delta,
        });
      };
      const handleResizeEnd = () => {
        removeResizeListeners.current();
        requestAnimationFrame(() => requestAnimationFrame(() => setResizePreviewWidths(undefined)));
      };
      removeResizeListeners.current = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleResizeEnd);
        window.removeEventListener("blur", handleResizeEnd);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleResizeEnd);
      window.addEventListener("blur", handleResizeEnd);
    },
    [onMouseDownCapture],
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

      const width = `${(getRenderedWidth(column) / totalWidth) * 100}%`;
      const fittedWidth = { width, minWidth: width, maxWidth: width };
      const cellsStyle = column.cellsStyle ?? defaultColumnProps?.cellsStyle;
      return {
        ...column,
        titleStyle: [column.titleStyle, fittedWidth],
        cellsStyle: (record: T, index: number) => [cellsStyle?.(record, index), fittedWidth, { padding: cellPadding }],
      };
    });
  }, [cellPadding, columns, defaultColumnProps?.cellsStyle, resizePreviewWidths]);

  return (
    <DataTable<T>
      withTableBorder={false}
      borderRadius={0}
      highlightOnHover
      striped="odd"
      stripedColor={{ dark: "dark.7", light: "gray.0" }}
      highlightOnHoverColor={{ dark: "dark.5", light: "gray.1" }}
      verticalAlign="center"
      loaderBackgroundBlur={2}
      textSelectionDisabled
      height="100%"
      {...props}
      columns={fittedColumns}
      onMouseDownCapture={handleMouseDownCapture}
      className={mergedClassName}
      style={[{ pointerEvents: isEditMode ? "none" : undefined }, style]}
      defaultColumnProps={{
        ...defaultColumnProps,
        noWrap: defaultColumnProps?.noWrap ?? true,
        draggable: !isEditMode,
        resizable: !isEditMode,
        cellsStyle: defaultColumnProps?.cellsStyle ?? (() => ({ padding: cellPadding })),
      }}
      scrollAreaProps={{ type: "auto", scrollbarSize: 6, ...scrollAreaProps }}
    />
  );
}
