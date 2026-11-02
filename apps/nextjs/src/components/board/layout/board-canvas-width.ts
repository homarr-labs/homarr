/**
 * Painted board height is proportional to width. When that height is only just
 * past the scrollport, the vertical scrollbar narrows the page, the board
 * shrinks enough to fit, and the scrollbar leaves — handing those pixels back
 * and starting the cycle again. A growth no larger than the scrollbar is that
 * hand-back. Keep the narrower width unless the page is already scrolling, or
 * the space under the board can absorb the extra height.
 */
const SCROLLBAR_GROWTH_TOLERANCE_PX = 1;
const ROOM_BELOW_BOARD_TOLERANCE_PX = 8;
const SCROLLPORT_OVERFLOW_TOLERANCE_PX = 1;

interface StabilizeBoardCanvasWidthInput {
  measuredWidth: number;
  stableWidth: number;
  logicalWidth: number;
  logicalHeight: number;
  scrollportHeight: number;
  contentHeight: number;
  roomBelowBoard: number;
  scrollbarWidth: number;
}

const isPositiveFinite = (value: number) => Number.isFinite(value) && value > 0;

export const stabilizeBoardCanvasWidth = ({
  measuredWidth,
  stableWidth,
  logicalWidth,
  logicalHeight,
  scrollportHeight,
  contentHeight,
  roomBelowBoard,
  scrollbarWidth,
}: StabilizeBoardCanvasWidthInput): number => {
  if (!isPositiveFinite(measuredWidth)) return isPositiveFinite(stableWidth) ? stableWidth : 0;
  if (!isPositiveFinite(stableWidth)) return measuredWidth;

  const growth = measuredWidth - stableWidth;
  if (!(growth > 0) || !isPositiveFinite(scrollbarWidth) || growth > scrollbarWidth + SCROLLBAR_GROWTH_TOLERANCE_PX) {
    return measuredWidth;
  }

  if (
    isPositiveFinite(scrollportHeight) &&
    Number.isFinite(contentHeight) &&
    contentHeight > scrollportHeight + SCROLLPORT_OVERFLOW_TOLERANCE_PX
  ) {
    return measuredWidth;
  }

  if (isPositiveFinite(logicalWidth) && isPositiveFinite(logicalHeight) && Number.isFinite(roomBelowBoard)) {
    const addedHeight = (logicalHeight * growth) / logicalWidth;
    if (roomBelowBoard > addedHeight + ROOM_BELOW_BOARD_TOLERANCE_PX) return measuredWidth;
  }

  return stableWidth;
};

const SCROLLABLE_OVERFLOW = new Set(["auto", "scroll", "overlay"]);

export const getBoardScrollport = (start: HTMLElement | null): HTMLElement => {
  const fallback =
    document.scrollingElement instanceof HTMLElement ? document.scrollingElement : document.documentElement;
  let current = start?.parentElement ?? null;

  while (current) {
    const overflowY = getComputedStyle(current).overflowY;
    const scrolls =
      SCROLLABLE_OVERFLOW.has(overflowY) &&
      current.scrollHeight > current.clientHeight + SCROLLPORT_OVERFLOW_TOLERANCE_PX;
    if (scrolls) return current;
    current = current.parentElement;
  }

  return fallback;
};

let cachedScrollbarWidth: number | null = null;

export const getClassicScrollbarWidth = (): number => {
  if (cachedScrollbarWidth !== null) return cachedScrollbarWidth;
  if (typeof document === "undefined") return 0;

  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.top = "-9999px";
  probe.style.width = "100px";
  probe.style.height = "100px";
  probe.style.overflow = "scroll";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.documentElement.append(probe);
  const measured = probe.offsetWidth - probe.clientWidth;
  probe.remove();

  if (!Number.isFinite(measured) || measured <= 0) return 0;
  cachedScrollbarWidth = measured;
  return cachedScrollbarWidth;
};
