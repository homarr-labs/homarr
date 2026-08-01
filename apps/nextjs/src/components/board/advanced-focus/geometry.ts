import { appShellHeaderHeight } from "../../layout/constants";

export interface FocusRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const getAdvancedFocusRect = (source: FocusRect, viewport: { width: number; height: number }): FocusRect => {
  const margin = viewport.width < 640 ? 8 : 24;
  const availableWidth = Math.max(0, viewport.width - margin * 2);
  const availableHeight = Math.max(0, viewport.height - appShellHeaderHeight - margin * 2);
  const width = Math.min(availableWidth, Math.max(source.width, Math.min(960, source.width * 2.4)));
  const height = Math.min(availableHeight, Math.max(source.height, Math.min(720, source.height * 2.4)));

  return {
    left: Math.max(margin, (viewport.width - width) / 2),
    top: Math.max(
      appShellHeaderHeight + margin,
      appShellHeaderHeight + (viewport.height - appShellHeaderHeight - height) / 2,
    ),
    width,
    height,
  };
};
