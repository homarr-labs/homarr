"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// mantine-datatable's own resize handles shrink every other column to keep the table's
// total width fixed, which collapses columns toward zero in a narrow widget (upstream
// limitation: https://github.com/icflorescu/mantine-datatable/discussions/757). This
// handle instead resizes only the column it belongs to, letting the table grow and
// scroll horizontally instead.
const minColumnWidth = 60;
const maxColumnWidth = 10_000;

interface ColumnResizeHandleProps {
  columnLabel: string;
  currentWidth: number | undefined;
  onResize: (widthPx: number) => void;
  onResizeStart: (columns: { accessor: string; width: string }[]) => void;
}

export function ColumnResizeHandle({ columnLabel, currentWidth, onResize, onResizeStart }: ColumnResizeHandleProps) {
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
  const [widthPx, setWidthPx] = useState(currentWidth ?? minColumnWidth);

  useEffect(() => {
    if (currentWidth !== undefined) setWidthPx(currentWidth);
  }, [currentWidth]);

  const measureColumn = useCallback((target: HTMLInputElement) => {
    const th = target.closest("th");
    if (!th) return undefined;

    const width = Math.round(th.getBoundingClientRect().width);
    setWidthPx(width);
    return width;
  }, []);

  const snapshotColumnWidths = useCallback(
    (target: HTMLInputElement) => {
      const thead = target.closest("thead");
      if (!thead) return;

      const widths = Array.from(thead.querySelectorAll<HTMLTableCellElement>("th[data-accessor]")).flatMap((th) => {
        const accessor = th.dataset.accessor;
        if (!accessor || accessor === "__selection__") return [];
        return [{ accessor, width: `${Math.round(th.getBoundingClientRect().width)}px` }];
      });
      onResizeStart(widths);
    },
    [onResizeStart],
  );

  const resizeTo = useCallback(
    (width: number) => {
      const nextWidth = Math.min(maxColumnWidth, Math.max(minColumnWidth, Math.round(width)));
      setWidthPx(nextWidth);
      onResize(nextWidth);
    },
    [onResize],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLInputElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const startWidth = measureColumn(event.currentTarget);
      if (startWidth === undefined) return;

      snapshotColumnWidths(event.currentTarget);
      event.currentTarget.focus({ preventScroll: true });
      dragState.current = { startX: event.clientX, startWidth };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [measureColumn, snapshotColumnWidths],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLInputElement>) => {
      if (!dragState.current) return;
      const delta = event.clientX - dragState.current.startX;
      resizeTo(dragState.current.startWidth + delta);
    },
    [resizeTo],
  );

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLInputElement>) => {
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();
      const currentColumnWidth = measureColumn(event.currentTarget);
      if (currentColumnWidth === undefined) return;

      let nextWidth: number;
      if (event.key === "ArrowLeft") nextWidth = currentColumnWidth - 10;
      else if (event.key === "ArrowRight") nextWidth = currentColumnWidth + 10;
      else if (event.key === "Home") nextWidth = minColumnWidth;
      else return;

      event.preventDefault();
      snapshotColumnWidths(event.currentTarget);
      resizeTo(nextWidth);
    },
    [measureColumn, resizeTo, snapshotColumnWidths],
  );

  return (
    <input
      type="range"
      min={minColumnWidth}
      max={maxColumnWidth}
      step={10}
      value={widthPx}
      aria-label={`Resize ${columnLabel} column`}
      className="homarr-column-resize-handle"
      onFocus={(event) => measureColumn(event.currentTarget)}
      onChange={(event) => resizeTo(event.currentTarget.valueAsNumber)}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={() => {
        dragState.current = null;
      }}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
