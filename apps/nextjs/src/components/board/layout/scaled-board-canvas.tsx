"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mantine/core";
import { useMergedRef } from "@mantine/hooks";

import { calculateBoardUiScale } from "@homarr/boards/scale";

import classes from "./scaled-board-canvas.module.css";
import { calculateBoardCanvasScale, fitBoardCanvas } from "./board-canvas-fitting";
import { useDeferredElementSize } from "@homarr/ui/hooks";

export { calculateBoardUiScale } from "@homarr/boards/scale";
export { calculateBoardCanvasScale } from "./board-canvas-fitting";

const BoardCanvasScaleContext = createContext(1);

export const useBoardCanvasScale = () => useContext(BoardCanvasScaleContext);

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
  const { ref: viewportRef, width: availableWidth } = useDeferredElementSize<HTMLDivElement>();
  const { ref: canvasRef, height: logicalHeight } = useDeferredElementSize<HTMLDivElement>();
  const fittingViewportRef = useRef<HTMLDivElement>(null);
  const mergedViewportRef = useMergedRef(viewportRef, fittingViewportRef);
  const [isHydrated, setIsHydrated] = useState(false);

  useLayoutEffect(() => {
    const viewport = fittingViewportRef.current;
    if (!viewport) return;
    return fitBoardCanvas(viewport);
  }, [logicalWidth, initialAvailableWidth, initialLogicalHeight]);

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
      ref={mergedViewportRef}
      className={classes.viewport}
      data-testid="board-canvas"
      data-board-hydrated={isHydrated ? "true" : "false"}
      data-canvas-scale={scale}
      data-canvas-measured-width={availableWidth}
      data-canvas-overflow={hasHorizontalOverflow ? "true" : "false"}
      data-canvas-initial-height={initialLogicalHeight}
      data-canvas-initial-width={initialAvailableWidth}
      aria-label={label}
    >
      <Box
        className={classes.sizer}
        style={{ width: visualWidth, height: resolvedLogicalHeight * scale }}
        suppressHydrationWarning
      >
        <Box
          ref={canvasRef}
          data-board-canvas-content
          data-logical-width={logicalWidth}
          className={classes.canvas}
          suppressHydrationWarning
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
