"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Box } from "@mantine/core";

import { calculateBoardUiScale } from "@homarr/boards/scale";

import classes from "./scaled-board-canvas.module.css";
import { useHydrationSafeElementSize } from "./use-hydration-safe-element-size";

export { calculateBoardUiScale } from "@homarr/boards/scale";

const BoardCanvasScaleContext = createContext(1);

export const useBoardCanvasScale = () => useContext(BoardCanvasScaleContext);

export const calculateBoardCanvasScale = (availableWidth: number, logicalWidth: number) => {
  if (!Number.isFinite(availableWidth) || !Number.isFinite(logicalWidth)) return 1;
  if (availableWidth <= 0 || logicalWidth <= 0) return 1;

  return availableWidth / logicalWidth;
};

// Server HTML is reused across widths of one layout, including prepared views.
// Fit it to the real viewport before first paint; React takes over on hydration.
// Section grids derive their insets and UI scale from the canvas scale, so
// rescale those server values too. Streamed Suspense content is parsed hidden,
// so wait until it has a size.
const fitBeforePaintScript = `(()=>{const v=document.currentScript?.previousElementSibling,s=v?.firstElementChild,c=s?.firstElementChild;if(!c)return;const u=k=>k<1?1/k:1,k0=Number(v.dataset.canvasScale);const scaleVar=(e,n,f)=>{const x=parseFloat(e.style.getPropertyValue(n));if(Number.isFinite(x))e.style.setProperty(n,n==="--board-container-inset"?x*f+"px":String(x*f))};const fit=()=>{const w=v.clientWidth,l=Number(c.dataset.logicalWidth),h=Number(v.dataset.canvasInitialHeight);if(!(w>0&&l>0&&k0>0))return false;const k=w/l;s.style.width=l*k+"px";s.style.height=h*k+"px";c.style.zoom=String(k);c.style.setProperty("--board-canvas-inverse-scale",String(1/k));c.style.setProperty("--board-canvas-ui-scale",String(u(k)));for(const e of c.querySelectorAll("[data-grid-section-id]")){scaleVar(e,"--board-canvas-inverse-scale",k0/k);scaleVar(e,"--board-canvas-ui-scale",u(k)/u(k0))}for(const e of c.querySelectorAll("[data-section-id]"))scaleVar(e,"--board-container-inset",k0/k);return true};if(fit())return;const o=new ResizeObserver(()=>{if(v.dataset.boardHydrated==="true"||fit())o.disconnect()});o.observe(v)})()`;

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
  const { ref: viewportRef, width: availableWidth } = useHydrationSafeElementSize<HTMLDivElement>();
  const { ref: canvasRef, height: logicalHeight } = useHydrationSafeElementSize<HTMLDivElement>();
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
    <>
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
      <script dangerouslySetInnerHTML={{ __html: fitBeforePaintScript }} />
    </>
  );
};
