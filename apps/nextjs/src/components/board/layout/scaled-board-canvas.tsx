"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import classes from "./scaled-board-canvas.module.css";

const BoardCanvasScaleContext = createContext(1);

export const useBoardCanvasScale = () => useContext(BoardCanvasScaleContext);

export const calculateBoardCanvasScale = (availableWidth: number, logicalWidth: number) => {
  if (!Number.isFinite(availableWidth) || !Number.isFinite(logicalWidth)) return 1;
  if (availableWidth <= 0 || logicalWidth <= 0) return 1;

  return availableWidth / logicalWidth;
};

export const calculateBoardUiScale = (canvasScale: number) => {
  if (!Number.isFinite(canvasScale) || canvasScale <= 0) return 1;

  return canvasScale < 1 ? 1 / canvasScale : 1;
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
  const hasHorizontalOverflow = resolvedAvailableWidth > 0 && visualWidth - resolvedAvailableWidth > 0.5;

  return (
    <Box
      component="section"
      ref={viewportRef}
      className={classes.viewport}
      data-testid="board-canvas"
      data-board-hydrated={isHydrated ? "true" : "false"}
      data-canvas-scale={scale}
      data-canvas-overflow={hasHorizontalOverflow ? "true" : "false"}
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
