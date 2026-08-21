"use client";

import { useCallback, useRef } from "react";

// mantine-datatable's own resize handles shrink every other column to keep the table's
// total width fixed, which collapses columns toward zero in a narrow widget (upstream
// limitation: https://github.com/icflorescu/mantine-datatable/discussions/757). This
// handle instead resizes only the column it belongs to, letting the table grow and
// scroll horizontally instead.
const minColumnWidth = 60;

interface ColumnResizeHandleProps {
  onResize: (widthPx: number) => void;
}

export function ColumnResizeHandle({ onResize }: ColumnResizeHandleProps) {
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const th = event.currentTarget.closest("th");
    if (!th) return;
    dragState.current = { startX: event.clientX, startWidth: th.getBoundingClientRect().width };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      const delta = event.clientX - dragState.current.startX;
      onResize(Math.max(minColumnWidth, Math.round(dragState.current.startWidth + delta)));
    },
    [onResize],
  );

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className="homarr-column-resize-handle"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(event) => event.stopPropagation()}
    />
  );
}
