"use client";

import type { CSSProperties, PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import { BOARD_GRID_ITEM_INSET, LOGICAL_GRID_PITCH } from "./constants";
import classes from "./scaled-board-canvas.module.css";

const BoardCanvasScaleContext = createContext(1);
const BoardCanvasViewportHeightContext = createContext<number | null>(null);

export const useBoardCanvasScale = () => useContext(BoardCanvasScaleContext);
export const useBoardCanvasViewportHeight = () => useContext(BoardCanvasViewportHeightContext);

export const calculateBoardCanvasScale = (availableWidth: number, logicalWidth: number) => {
  if (!Number.isFinite(availableWidth) || !Number.isFinite(logicalWidth)) return 1;
  if (availableWidth <= 0 || logicalWidth <= 0) return 1;

  return availableWidth / logicalWidth;
};

export const calculateFixedBoardCanvasScale = (fixedItemSize: number) => {
  if (!Number.isFinite(fixedItemSize) || fixedItemSize <= 0) return 1;

  // The configured size is the painted card, after the two fixed physical insets
  // have been removed from its scaled logical grid footprint.
  return (fixedItemSize + 2 * BOARD_GRID_ITEM_INSET) / LOGICAL_GRID_PITCH;
};

export const calculateBoardUiScale = (canvasScale: number) => {
  if (!Number.isFinite(canvasScale) || canvasScale <= 0) return 1;

  return canvasScale < 1 ? 1 / canvasScale : 1;
};

interface ScaledBoardCanvasProps {
  logicalWidth: number;
  initialLogicalHeight: number;
  initialAvailableWidth: number;
  fixedItemSize?: number;
  label: string;
}

/**
 * Scales the complete board as one surface while keeping widget layout in
 * fixed logical pixels. Responsive scaling fits the canvas to its viewport;
 * fixed scaling contains overflow in a keyboard-scrollable canvas region.
 */
export const ScaledBoardCanvas = ({
  logicalWidth,
  initialLogicalHeight,
  initialAvailableWidth,
  fixedItemSize,
  label,
  children,
}: PropsWithChildren<ScaledBoardCanvasProps>) => {
  const { ref: viewportRef, width: availableWidth, height: viewportHeight } = useElementSize<HTMLDivElement>();
  const { ref: canvasRef, height: logicalHeight } = useElementSize<HTMLDivElement>();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const resolvedAvailableWidth = availableWidth > 0 ? availableWidth : initialAvailableWidth;
  const resolvedLogicalHeight = logicalHeight > 0 ? logicalHeight : initialLogicalHeight;
  const isFixedScaling = fixedItemSize !== undefined;
  const scale = useMemo(() => {
    if (fixedItemSize !== undefined) return calculateFixedBoardCanvasScale(fixedItemSize);

    return calculateBoardCanvasScale(resolvedAvailableWidth, logicalWidth);
  }, [fixedItemSize, logicalWidth, resolvedAvailableWidth]);
  const uiScale = calculateBoardUiScale(scale);
  const inverseScale = scale > 0 ? 1 / scale : 1;
  const visualWidth = logicalWidth * scale;
  const hasHorizontalOverflow = resolvedAvailableWidth > 0 && visualWidth - resolvedAvailableWidth > 0.5;
  const shouldCenterCanvas = isFixedScaling && visualWidth <= resolvedAvailableWidth;

  return (
    <Box
      component="section"
      ref={viewportRef}
      className={classes.viewport}
      data-testid="board-canvas"
      data-board-hydrated={isHydrated ? "true" : "false"}
      data-canvas-scaling={isFixedScaling ? "fixed" : "responsive"}
      data-canvas-scale={scale}
      data-canvas-overflow={hasHorizontalOverflow ? "true" : "false"}
      data-canvas-centered={shouldCenterCanvas ? "true" : undefined}
      data-canvas-initial-height={initialLogicalHeight}
      data-canvas-initial-width={initialAvailableWidth}
      aria-label={label}
      tabIndex={isFixedScaling ? 0 : undefined}
    >
      <Box
        className={classes.sizer}
        style={
          {
            "--board-canvas-scale": scale,
            width: visualWidth,
            height: resolvedLogicalHeight * scale,
          } as CSSProperties
        }
      >
        <Box
          ref={canvasRef}
          className={classes.canvas}
          style={{
            "--board-grid-card-inset": `${BOARD_GRID_ITEM_INSET}px`,
            "--board-canvas-inverse-scale": inverseScale,
            "--board-canvas-ui-scale": uiScale,
            width: logicalWidth,
            zoom: scale,
          }}
        >
          <BoardCanvasScaleContext.Provider value={scale}>
            <BoardCanvasViewportHeightContext.Provider value={isFixedScaling ? viewportHeight : null}>
              {children}
            </BoardCanvasViewportHeightContext.Provider>
          </BoardCanvasScaleContext.Provider>
        </Box>
      </Box>
    </Box>
  );
};
