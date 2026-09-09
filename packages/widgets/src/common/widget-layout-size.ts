interface WidgetDisplay {
  displayScale?: number;
  displayMode?: "compact" | "advanced";
}

export const getWidgetDisplayScale = ({ displayScale = 1, displayMode }: WidgetDisplay): number => {
  // Advanced surfaces are outside the scaled board, even when their source tile is not.
  if (displayMode === "advanced" || !Number.isFinite(displayScale) || displayScale <= 0) return 1;
  return displayScale;
};

/** Visible dimensions for density, breakpoints, and content budgets.
 * Keep the original logical dimensions for canvas/SVG geometry and CSS pixel sizes.
 */
export const getWidgetLayoutSize = ({
  width,
  height,
  ...display
}: WidgetDisplay & { width: number; height: number }) => {
  const scale = getWidgetDisplayScale(display);
  return { width: width * scale, height: height * scale };
};
