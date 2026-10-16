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

const setBoardCanvasStyle = (element: HTMLElement, property: string, value: number, suffix = "") => {
  const current = Number.parseFloat(element.style.getPropertyValue(property));
  if (Number.isFinite(current) && Math.abs(current - value) < 0.000001) return;
  element.style.setProperty(property, `${value}${suffix}`);
};

const installBoardCanvasFitting = (
  calculateScale: typeof calculateBoardCanvasScale,
  calculateUiScale: typeof calculateBoardUiScale,
  setStyle: typeof setBoardCanvasStyle,
) => {
  const viewport = document.currentScript?.previousElementSibling;
  if (!(viewport instanceof HTMLElement)) return;
  const sizer = viewport.firstElementChild;
  const canvas = sizer?.firstElementChild;
  if (!(sizer instanceof HTMLElement) || !(canvas instanceof HTMLElement)) return;

  const adjustedStyles = new WeakMap<HTMLElement, Map<string, { value: number; scale: number; applied: string }>>();
  const adjustStyle = (
    element: HTMLElement,
    property: string,
    renderedScale: number,
    factor: (sourceScale: number) => number,
    suffix = "",
  ) => {
    const current = element.style.getPropertyValue(property);
    const value = Number.parseFloat(current);
    if (!Number.isFinite(value)) return;
    let styles = adjustedStyles.get(element);
    if (!styles) {
      styles = new Map();
      adjustedStyles.set(element, styles);
    }
    let source = styles.get(property);
    if (!source || source.applied !== current) {
      source = { value, scale: renderedScale, applied: current };
      styles.set(property, source);
    }
    setStyle(element, property, source.value * factor(source.scale), suffix);
    source.applied = element.style.getPropertyValue(property);
  };
  const check = () => {
    if (!viewport.isConnected) {
      stop();
      return;
    }
    const width = viewport.clientWidth;
    const logicalWidth = Number(canvas.dataset.logicalWidth);
    const renderedScale = Number(viewport.dataset.canvasScale);
    if (!(width > 0 && logicalWidth > 0 && renderedScale > 0)) return;
    const measuredWidth = Number(viewport.dataset.canvasMeasuredWidth);
    if (
      measuredWidth > 0 &&
      Math.abs(measuredWidth - width) < 1 &&
      Math.abs(renderedScale * logicalWidth - width) < 1 &&
      Math.abs(Number(canvas.style.zoom) * logicalWidth - width) < 1
    ) {
      stop();
      return;
    }

    const scale = calculateScale(width, logicalWidth);
    const uiScale = calculateUiScale(scale);
    setStyle(sizer, "width", logicalWidth * scale, "px");
    setStyle(sizer, "height", Number(viewport.dataset.canvasInitialHeight) * scale, "px");
    setStyle(canvas, "zoom", scale);
    setStyle(canvas, "--board-canvas-inverse-scale", 1 / scale);
    setStyle(canvas, "--board-canvas-ui-scale", uiScale);
    for (const section of canvas.querySelectorAll<HTMLElement>("[data-grid-section-id]")) {
      adjustStyle(section, "--board-canvas-inverse-scale", renderedScale, (source) => source / scale);
      adjustStyle(section, "--board-canvas-ui-scale", renderedScale, (source) => uiScale / calculateUiScale(source));
    }
    for (const section of canvas.querySelectorAll<HTMLElement>("[data-section-id]")) {
      adjustStyle(section, "--board-container-inset", renderedScale, (source) => source / scale, "px");
    }
  };
  const mutations = new MutationObserver(check);
  const measurements = new ResizeObserver(check);
  const stop = () => {
    mutations.disconnect();
    measurements.disconnect();
  };
  mutations.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  measurements.observe(viewport);
  check();
};

const fitBeforePaintScript = `(${installBoardCanvasFitting.toString()})(${calculateBoardCanvasScale.toString()},${calculateBoardUiScale.toString()},${setBoardCanvasStyle.toString()})`;

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
      <script dangerouslySetInnerHTML={{ __html: fitBeforePaintScript }} />
    </>
  );
};
