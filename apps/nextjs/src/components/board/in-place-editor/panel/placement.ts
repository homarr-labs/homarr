export const viewportMargin = 12;
export const anchorGap = 16;
const minPanelHeight = 220;
const pickComfortableHeight = 440;
const notchInset = 24;

export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
  top?: number;
}

export type PlacementSide = "left" | "right" | "above" | "below" | "overlap";

export interface Placement {
  side: PlacementSide;
  flipped: boolean;
  left: number;
  top: number;
  height: number;
  maxHeight: number;
  notchY: number;
}

interface PlacementInput {
  rect: RectLike;
  width: number;
  contentHeight: number;
  viewport: ViewportSize;
  isPick: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

const getHorizontal = (rect: RectLike, width: number, viewport: ViewportSize) => {
  const rightLeft = rect.right + anchorGap;
  if (rightLeft + width + viewportMargin <= viewport.width) return { side: "right" as const, left: rightLeft };
  const leftLeft = rect.left - anchorGap - width;
  if (leftLeft >= viewportMargin) return { side: "left" as const, left: leftLeft };
  return {
    side: "overlap" as const,
    left: clamp(viewport.width - width - viewportMargin, viewportMargin, viewport.width),
  };
};

export const getPlacement = ({ rect, width, contentHeight, viewport, isPick }: PlacementInput): Placement => {
  const horizontal = getHorizontal(rect, width, viewport);

  if (isPick) {
    const below = viewport.height - viewportMargin - Math.max(rect.top, viewportMargin);
    const above = Math.min(rect.bottom, viewport.height - viewportMargin) - viewportMargin;
    const flipped = below < pickComfortableHeight && above > below;

    if (flipped) {
      const bottomLine = clamp(rect.bottom, viewportMargin + minPanelHeight, viewport.height - viewportMargin);
      const maxHeight = bottomLine - viewportMargin;
      const height = Math.min(contentHeight, maxHeight);
      const top = bottomLine - height;
      return {
        ...horizontal,
        flipped,
        top,
        height,
        maxHeight,
        notchY: getNotchY(rect, top, height),
      };
    }

    const top = clamp(rect.top, viewportMargin, viewport.height - viewportMargin - minPanelHeight);
    const maxHeight = viewport.height - viewportMargin - top;
    const height = Math.min(contentHeight, maxHeight);
    return { ...horizontal, flipped, top, height, maxHeight, notchY: getNotchY(rect, top, height) };
  }

  const maxHeight = viewport.height - viewportMargin * 2;
  const height = Math.min(contentHeight, maxHeight);
  if (horizontal.side === "overlap") {
    const below = viewport.height - rect.bottom - anchorGap - viewportMargin;
    const above = rect.top - anchorGap - viewportMargin;
    if (Math.max(below, above) >= Math.min(Math.max(contentHeight, 280), 440)) {
      const isBelow = below >= above;
      const available = isBelow ? below : above;
      const panelHeight = Math.min(contentHeight, available);
      return {
        side: isBelow ? "below" : "above",
        left: clamp(rect.left, viewportMargin, viewport.width - width - viewportMargin),
        top: isBelow ? rect.bottom + anchorGap : rect.top - anchorGap - panelHeight,
        height: panelHeight,
        maxHeight: available,
        flipped: false,
        notchY: 0,
      };
    }
    return { ...horizontal, top: viewportMargin, height, maxHeight, flipped: false, notchY: 0 };
  }
  const top = clamp(rect.top, viewportMargin, viewport.height - viewportMargin - height);
  return { ...horizontal, flipped: false, top, height, maxHeight, notchY: getNotchY(rect, top, height) };
};

const getNotchY = (rect: RectLike, top: number, height: number) => {
  const focusY = rect.top + Math.min(rect.height / 2, 40);
  return clamp(focusY - top, notchInset, height - notchInset);
};
