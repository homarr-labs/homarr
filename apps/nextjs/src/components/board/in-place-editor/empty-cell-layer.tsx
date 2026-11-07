"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { getLogicalItemStyle } from "~/components/board/layout";
import classes from "./empty-cell-layer.module.css";
import { buildOccupiedCells, getFreeRect, isCellFree } from "./occupancy";
import type { CellPoint, SectionOccupancy } from "./occupancy";
import { addInPlaceActions, getAddInPlaceState } from "./store";
import type { AreaRect } from "./types";

const rowScale = "var(--board-grid-row-scale, 1)";

interface EmptyCellLayerProps {
  occupancy: SectionOccupancy;
  onRowCountChange: (rowCount: number) => void;
}

interface DragState {
  anchor: CellPoint;
  rect: AreaRect;
  rowCount: number;
}

export const EmptyCellLayer = ({ occupancy, onRowCountChange }: EmptyCellLayerProps) => {
  const { sectionId, columnCount, rowCount, maxRowCount, placements } = occupancy;
  const layerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const occupied = useMemo(() => buildOccupiedCells(placements), [placements]);
  const rows = maxRowCount ?? rowCount;
  const cellRowCount = drag?.rowCount ?? rows;

  const freeCells = useMemo(() => {
    const cells: CellPoint[] = [];
    for (let y = 0; y < cellRowCount; y++) {
      for (let x = 0; x < columnCount; x++) {
        if (isCellFree(occupied, { x, y })) cells.push({ x, y });
      }
    }
    return cells;
  }, [cellRowCount, columnCount, occupied]);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      dragRef.current = null;
      onRowCountChange(0);
    },
    [columnCount, maxRowCount, onRowCountChange, sectionId],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, cell: CellPoint) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const layer = layerRef.current;
    const bounds = layer?.getBoundingClientRect();
    if (!layer || !bounds || bounds.width === 0 || bounds.height === 0) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    cleanupRef.current?.();
    const pointerId = event.pointerId;
    const rowPitch = bounds.height / rows;
    let clientX = event.clientX;
    let clientY = event.clientY;
    let frame = 0;
    const controller = new AbortController();
    const cleanup = () => {
      controller.abort();
      window.cancelAnimationFrame(frame);
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;
    const initialDrag = { anchor: cell, rect: { x: cell.x, y: cell.y, w: 1, h: 1 }, rowCount };
    dragRef.current = initialDrag;
    setDrag(initialDrag);

    const update = () => {
      const current = dragRef.current;
      if (!current) return;
      if (getAddInPlaceState().session) return;
      const currentBounds = layer.getBoundingClientRect();
      const pointer = {
        x: Math.min(
          Math.max(0, Math.floor(((clientX - currentBounds.left) / currentBounds.width) * columnCount)),
          columnCount - 1,
        ),
        y: Math.max(0, Math.floor((clientY - currentBounds.top) / rowPitch)),
      };
      if (maxRowCount !== null) pointer.y = Math.min(pointer.y, maxRowCount - 1);
      const rect = getFreeRect(occupancy, occupied, current.anchor, pointer);
      const next = { ...current, rect };
      dragRef.current = next;
      setDrag(next);
      if (maxRowCount === null) onRowCountChange(rect.y + rect.h + 1);
    };

    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      clientX = moveEvent.clientX;
      clientY = moveEvent.clientY;
      update();
    };

    const handleUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      const current = dragRef.current;
      cleanup();
      dragRef.current = null;
      setDrag(null);
      onRowCountChange(0);
      if (current && !getAddInPlaceState().session) addInPlaceActions.startCreate(sectionId, current.rect);
    };

    const handleCancel = () => {
      cleanup();
      dragRef.current = null;
      setDrag(null);
      onRowCountChange(0);
    };

    let scrollParent = layer.parentElement;
    while (scrollParent && !/(auto|scroll)/.test(window.getComputedStyle(scrollParent).overflowY)) {
      scrollParent = scrollParent.parentElement;
    }
    const scroller = scrollParent ?? document.scrollingElement;
    const scroll = () => {
      if (!scroller) return;
      const scrollBounds = scrollParent?.getBoundingClientRect();
      const top = Math.max(0, scrollBounds?.top ?? 0);
      const bottom = Math.min(window.innerHeight, scrollBounds?.bottom ?? window.innerHeight);
      let delta = 0;
      if (clientY > bottom - 48) delta = Math.min(16, (clientY - bottom + 48) / 3);
      else if (clientY < top + 48) delta = -Math.min(16, (top + 48 - clientY) / 3);
      if (delta !== 0) {
        const previousScrollTop = scroller.scrollTop;
        scroller.scrollTop += delta;
        if (scroller.scrollTop !== previousScrollTop) update();
      }
      frame = window.requestAnimationFrame(scroll);
    };

    window.addEventListener("pointermove", handleMove, { signal: controller.signal });
    window.addEventListener("pointerup", handleUp, { signal: controller.signal });
    window.addEventListener(
      "pointercancel",
      (cancelEvent) => {
        if (cancelEvent.pointerId === pointerId) handleCancel();
      },
      { signal: controller.signal },
    );
    window.addEventListener("blur", handleCancel, { signal: controller.signal });
    frame = window.requestAnimationFrame(scroll);
  };

  return (
    <div
      ref={layerRef}
      className={classes.layer}
      data-add-in-place-cells={sectionId}
      data-dragging={drag ? "" : undefined}
    >
      {freeCells.map((cell) => (
        <button
          type="button"
          key={`${cell.x},${cell.y}`}
          className={classes.cell}
          aria-label={`Add widget at column ${cell.x + 1}, row ${cell.y + 1}`}
          style={getLogicalItemStyle({ x: cell.x, y: cell.y, w: 1, h: 1 }, rowScale)}
          onPointerDown={(event) => handlePointerDown(event, cell)}
          onClick={(event) => {
            if (event.detail === 0) addInPlaceActions.startCreate(sectionId, { x: cell.x, y: cell.y, w: 1, h: 1 });
          }}
        >
          <span className={classes.plus}>
            <IconPlus size={36} stroke={1.75} />
          </span>
        </button>
      ))}
      {drag && <div className={classes.selection} style={getLogicalItemStyle(drag.rect, rowScale)} />}
    </div>
  );
};
