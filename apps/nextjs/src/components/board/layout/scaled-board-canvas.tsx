"use client";

import type { CSSProperties, PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import { BOARD_GRID_ITEM_INSET } from "./constants";
import type { BoardScaling } from "./scaling";
import { calculateBoardUiScale, getBoardCanvasMetrics } from "./scaling";
import { useCanvasViewportSize } from "./use-canvas-viewport-size";
import classes from "./scaled-board-canvas.module.css";
import appearanceClasses from "./canvas-appearance.module.css";
import scrollbarClasses from "./canvas-scrollbar.module.css";

const BoardCanvasScaleContext = createContext(1);
const BoardCanvasViewportHeightContext = createContext<number | null>(null);

export const useBoardCanvasScale = () => useContext(BoardCanvasScaleContext);
export const useBoardCanvasViewportHeight = () => useContext(BoardCanvasViewportHeightContext);

interface ScaledBoardCanvasProps {
  logicalWidth: number;
  initialLogicalHeight: number;
  initialAvailableWidth: number;
  scaling: BoardScaling;
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
  scaling,
  label,
  children,
}: PropsWithChildren<ScaledBoardCanvasProps>) => {
  const { ref: viewportRef, width: availableWidth, height: viewportHeight } = useCanvasViewportSize();
  const { ref: canvasRef, height: logicalHeight } = useElementSize<HTMLDivElement>();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const resolvedAvailableWidth = availableWidth > 0 ? availableWidth : initialAvailableWidth;
  const resolvedLogicalHeight = logicalHeight > 0 ? logicalHeight : initialLogicalHeight;
  const isFixedScaling = scaling.mode === "fixed";
  const {
    scale,
    width: visualWidth,
    centered,
    overflows,
  } = getBoardCanvasMetrics(scaling, resolvedAvailableWidth, logicalWidth);
  const uiScale = calculateBoardUiScale(scale);
  const inverseScale = scale > 0 ? 1 / scale : 1;

  return (
    <Box
      component="section"
      ref={viewportRef}
      className={`${classes.viewport} ${isFixedScaling ? scrollbarClasses.scrollbar : ""}`}
      data-testid="board-canvas"
      data-board-hydrated={isHydrated ? "true" : "false"}
      data-canvas-scaling={scaling.mode}
      data-canvas-scale={scale}
      data-canvas-overflow={overflows ? "true" : "false"}
      data-canvas-centered={centered ? "true" : undefined}
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
          className={`${classes.canvas} ${appearanceClasses.appearance}`}
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
