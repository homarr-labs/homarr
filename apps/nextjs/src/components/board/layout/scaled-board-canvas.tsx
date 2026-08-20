"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import classes from "./scaled-board-canvas.module.css";

const BoardCanvasScaleContext = createContext(1);
/**
 * Below 100% the board keeps dashboard UI at its normal physical size by
 * inverse-scaling it against the canvas. That compensation cannot continue
 * forever: at 0.14 a `200 x 200` logical tile still has to host controls sized
 * for a desktop, so labels, tables and buttons overlap their neighbours.
 *
 * Stop compensating at 50% and let the remaining reduction behave like zooming
 * out a page. Tile content then keeps the proportions it was designed with
 * instead of overflowing its tile, and the canvas can still always fit the
 * viewport - the board never scrolls sideways.
 */
const MAX_BOARD_UI_COMPENSATION = 2;

export const useBoardCanvasScale = () => useContext(BoardCanvasScaleContext);

export const calculateBoardCanvasScale = (availableWidth: number, logicalWidth: number) => {
  if (!Number.isFinite(availableWidth) || !Number.isFinite(logicalWidth)) return 1;
  if (availableWidth <= 0 || logicalWidth <= 0) return 1;

  return availableWidth / logicalWidth;
};

export const calculateBoardUiScale = (canvasScale: number) => {
  if (!Number.isFinite(canvasScale) || canvasScale <= 0) return 1;
  if (canvasScale >= 1) return 1;

  return Math.min(1 / canvasScale, MAX_BOARD_UI_COMPENSATION);
};

interface ScaledBoardCanvasProps {
  logicalWidth: number;
  initialLogicalHeight: number;
  initialAvailableWidth: number;
  label: string;
}

/**
 * Scales the complete board as one surface while keeping widget layout in
 * fixed logical pixels. The complete canvas always fits its viewport so board
 * content can never widen the document or require horizontal scrolling.
 */
export const ScaledBoardCanvas = ({
  logicalWidth,
  initialLogicalHeight,
  initialAvailableWidth,
  label,
  children,
}: PropsWithChildren<ScaledBoardCanvasProps>) => {
  const { ref: viewportRef, width: availableWidth } = useElementSize<HTMLDivElement>();
  const { ref: canvasRef, height: logicalHeight } = useElementSize<HTMLDivElement>();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const resolvedAvailableWidth = availableWidth > 0 ? availableWidth : initialAvailableWidth;
  const resolvedLogicalHeight = logicalHeight > 0 ? logicalHeight : initialLogicalHeight;
  const scale = useMemo(
    () => calculateBoardCanvasScale(resolvedAvailableWidth, logicalWidth),
    [logicalWidth, resolvedAvailableWidth],
  );
  const uiScale = calculateBoardUiScale(scale);
  const inverseScale = scale > 0 ? 1 / scale : 1;
  const visualWidth = logicalWidth * scale;

  return (
    <Box
      component="section"
      ref={viewportRef}
      className={classes.viewport}
      data-testid="board-canvas"
      data-board-hydrated={isHydrated ? "true" : "false"}
      data-canvas-scale={scale}
      data-canvas-initial-height={initialLogicalHeight}
      data-canvas-initial-width={initialAvailableWidth}
      aria-label={label}
    >
      <Box className={classes.sizer} style={{ width: visualWidth, height: resolvedLogicalHeight * scale }}>
        <Box
          ref={canvasRef}
          className={classes.canvas}
          style={{
            "--board-canvas-inverse-scale": inverseScale,
            "--board-canvas-ui-scale": uiScale,
            width: logicalWidth,
            zoom: scale,
          }}
        >
          <BoardCanvasScaleContext.Provider value={scale}>{children}</BoardCanvasScaleContext.Provider>
        </Box>
      </Box>
    </Box>
  );
};
