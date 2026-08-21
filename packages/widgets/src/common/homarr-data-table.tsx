"use client";

import "./homarr-data-table.css";

import type { DataTableProps } from "mantine-datatable";
import { DataTable } from "mantine-datatable";

type HomarrDataTableProps<T> = DataTableProps<T> & {
  isEditMode: boolean;
  cellPadding: string;
  rowCursor?: "auto" | "default";
};

export function HomarrDataTable<T>({
  isEditMode,
  cellPadding,
  rowCursor = "auto",
  className,
  defaultColumnProps,
  scrollAreaProps,
  style,
  ...props
}: HomarrDataTableProps<T>) {
  const mergedClassName = [
    "homarr-data-table",
    rowCursor === "default" ? "homarr-data-table-row-cursor-default" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

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
      className={mergedClassName}
      style={[{ pointerEvents: isEditMode ? "none" : undefined }, style]}
      defaultColumnProps={{
        ...defaultColumnProps,
        noWrap: defaultColumnProps?.noWrap ?? true,
        draggable: !isEditMode,
        // Resizing is handled by our own ColumnResizeHandle (see use-persisted-table-layout.ts) -
        // mantine-datatable's built-in resize shrinks every other column to keep the table's
        // total width fixed, which collapses columns in a narrow widget.
        resizable: false,
        cellsStyle: defaultColumnProps?.cellsStyle ?? (() => ({ padding: cellPadding })),
      }}
      scrollAreaProps={{ type: "auto", scrollbarSize: 6, ...scrollAreaProps }}
    />
  );
}
