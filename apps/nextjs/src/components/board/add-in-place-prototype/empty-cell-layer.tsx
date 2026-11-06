"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { getLogicalItemStyle } from "~/components/board/layout";
import classes from "./empty-cell-layer.module.css";
import { buildOccupiedCells, getFreeRect, isCellFree } from "./occupancy";
import type { CellPoint, SectionOccupancy } from "./occupancy";
import { addInPlaceActions } from "./store";
import type { AreaRect } from "./types";

const rowScale = "var(--board-grid-row-scale, 1)";

interface EmptyCellLayerProps {
  occupancy: SectionOccupancy;
}

interface DragState {
  anchor: CellPoint;
  rect: AreaRect;
}

export const EmptyCellLayer = ({ occupancy }: EmptyCellLayerProps) => {
  const { sectionId, columnCount, rowCount, maxRowCount, placements } = occupancy;
  const layerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const occupied = useMemo(() => buildOccupiedCells(placements), [placements]);
  const rows = maxRowCount ?? rowCount;
  const isDragging = drag !== null;

  const freeCells = useMemo(() => {
    const cells: CellPoint[] = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columnCount; x++) {
        if (isCellFree(occupied, { x, y })) cells.push({ x, y });
      }
    }
    return cells;
  }, [columnCount, occupied, rows]);

  useEffect(() => {
    if (!isDragging) return;

    const toCell = (event: PointerEvent): CellPoint | null => {
      const rect = layerRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return null;
      const x = Math.floor(((event.clientX - rect.left) / rect.width) * columnCount);
      const y = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
      return {
        x: Math.min(Math.max(0, x), columnCount - 1),
        y: Math.min(Math.max(0, y), rows - 1),
      };
    };

    const handleMove = (event: PointerEvent) => {
      const current = dragRef.current;
      const cell = toCell(event);
      if (!current || !cell) return;
      const rect = getFreeRect({ columnCount, rowCount, maxRowCount }, occupied, current.anchor, cell);
      const next = { anchor: current.anchor, rect };
      dragRef.current = next;
      setDrag(next);
    };

    const handleUp = () => {
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (current) addInPlaceActions.startCreate(sectionId, current.rect);
    };

    const handleCancel = () => {
      dragRef.current = null;
      setDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [columnCount, isDragging, maxRowCount, occupied, rowCount, rows, sectionId]);

  const handlePointerDown = (event: React.PointerEvent, cell: CellPoint) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const next = { anchor: cell, rect: { x: cell.x, y: cell.y, w: 1, h: 1 } };
    dragRef.current = next;
    setDrag(next);
  };

  return (
    <div
      ref={layerRef}
      className={classes.layer}
      data-add-in-place-cells={sectionId}
      data-dragging={drag ? "" : undefined}
    >
      {freeCells.map((cell) => (
        <div
          key={`${cell.x},${cell.y}`}
          className={classes.cell}
          style={getLogicalItemStyle({ x: cell.x, y: cell.y, w: 1, h: 1 }, rowScale)}
          onPointerDown={(event) => handlePointerDown(event, cell)}
        >
          <span className={classes.plus}>
            <IconPlus size={18} stroke={2} />
          </span>
        </div>
      ))}
      {drag && <div className={classes.selection} style={getLogicalItemStyle(drag.rect, rowScale)} />}
    </div>
  );
};
