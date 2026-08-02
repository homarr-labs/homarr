import { appShellHeaderHeight } from "../../layout/constants";

export interface FocusRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FocusClosePosition {
  left: number;
  top: number;
}

const closeButtonSize = 44;
const closeButtonGap = 8;

export const getAdvancedFocusRect = (source: FocusRect, viewport: { width: number; height: number }): FocusRect => {
  const margin = viewport.width < 640 ? 8 : 16;
  const availableWidth = Math.max(0, viewport.width - margin * 2);
  const availableHeight = Math.max(0, viewport.height - appShellHeaderHeight - margin * 2);
  const preferredWidth = viewport.width < 640 ? availableWidth : Math.min(800, availableWidth);
  const preferredHeight = viewport.width < 640 ? availableHeight : Math.min(560, availableHeight);
  const width = Math.min(availableWidth, Math.max(source.width, preferredWidth));
  const height = Math.min(availableHeight, Math.max(source.height, preferredHeight));
  const minimumTop = appShellHeaderHeight + margin;
  const maximumLeft = Math.max(margin, viewport.width - margin - width);
  const maximumTop = Math.max(minimumTop, viewport.height - margin - height);

  return {
    left: Math.min(maximumLeft, Math.max(margin, source.left - (width - source.width) / 2)),
    top: Math.min(maximumTop, Math.max(minimumTop, source.top - (height - source.height) / 2)),
    width,
    height,
  };
};

export const getAdvancedFocusClosePosition = (surface: FocusRect, viewportWidth: number): FocusClosePosition => {
  const outsideOffset = closeButtonSize + closeButtonGap;
  const surfaceRight = surface.left + surface.width;

  if (viewportWidth - surfaceRight >= outsideOffset) {
    return { left: surfaceRight + closeButtonGap, top: surface.top };
  }

  if (surface.left >= outsideOffset) {
    return { left: surface.left - outsideOffset, top: surface.top };
  }

  return {
    left: Math.max(0, Math.min(viewportWidth - closeButtonSize, surfaceRight - outsideOffset)),
    top: surface.top + closeButtonGap,
  };
};
