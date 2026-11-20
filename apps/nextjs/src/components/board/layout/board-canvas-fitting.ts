import { calculateBoardUiScale } from "@homarr/boards/scale";

export const calculateBoardCanvasScale = (availableWidth: number, logicalWidth: number) => {
  if (!Number.isFinite(availableWidth) || !Number.isFinite(logicalWidth)) return 1;
  if (availableWidth <= 0 || logicalWidth <= 0) return 1;
  return availableWidth / logicalWidth;
};

const setBoardCanvasStyle = (element: HTMLElement, property: string, value: number, suffix = "") => {
  const current = Number.parseFloat(element.style.getPropertyValue(property));
  if (Number.isFinite(current) && Math.abs(current - value) < Math.max(1, Math.abs(value)) * 0.00001) return;
  element.style.setProperty(property, `${value}${suffix}`);
};

const installBoardCanvasFitting = (
  viewport: HTMLElement,
  calculateScale: typeof calculateBoardCanvasScale,
  calculateUiScale: typeof calculateBoardUiScale,
  setStyle: typeof setBoardCanvasStyle,
) => {
  const cleanupKey = Symbol.for("homarr.boardCanvasFitting");
  const fittingViewport = viewport as HTMLElement & Record<symbol, unknown>;
  const existingCleanup = fittingViewport[cleanupKey];
  if (typeof existingCleanup === "function") {
    return () => {
      existingCleanup();
    };
  }

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
  let frame = 0;
  const scheduleCheck = () => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      check();
    });
  };
  const mutations = new MutationObserver(scheduleCheck);
  const measurements = new ResizeObserver(scheduleCheck);
  const stop = () => {
    cancelAnimationFrame(frame);
    mutations.disconnect();
    measurements.disconnect();
    if (fittingViewport[cleanupKey] === stop) delete fittingViewport[cleanupKey];
  };
  fittingViewport[cleanupKey] = stop;
  mutations.observe(viewport, {
    attributes: true,
    attributeFilter: ["data-canvas-scale", "data-canvas-measured-width", "data-logical-width"],
    childList: true,
    subtree: true,
  });
  measurements.observe(viewport);
  check();
  return stop;
};

export const fitBoardCanvas = (viewport: HTMLElement) =>
  installBoardCanvasFitting(viewport, calculateBoardCanvasScale, calculateBoardUiScale, setBoardCanvasStyle);

const watchInitialBoardCanvases = (
  install: typeof installBoardCanvasFitting,
  calculateScale: typeof calculateBoardCanvasScale,
  calculateUiScale: typeof calculateBoardUiScale,
  setStyle: typeof setBoardCanvasStyle,
) => {
  const initialized = new WeakSet<HTMLElement>();
  const scan = () => {
    for (const viewport of document.querySelectorAll<HTMLElement>('[data-testid="board-canvas"]')) {
      if (initialized.has(viewport)) continue;
      if (install(viewport, calculateScale, calculateUiScale, setStyle)) initialized.add(viewport);
    }
  };
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => observer.disconnect(), { once: true });
  } else {
    observer.disconnect();
  }
};

export const getBoardCanvasFittingScript = () =>
  `(${watchInitialBoardCanvases.toString()})(${installBoardCanvasFitting.toString()},${calculateBoardCanvasScale.toString()},${calculateBoardUiScale.toString()},${setBoardCanvasStyle.toString()})`;
