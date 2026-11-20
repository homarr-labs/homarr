export const boardViewportWidthCookieName = "homarr-viewport-width";

interface ResponsiveLayout {
  id: string;
  breakpoint: number;
}

export const getRequestedLayoutId = (
  layouts: readonly Pick<ResponsiveLayout, "id">[],
  layoutId: string | null | undefined,
  edit: string | null | undefined,
): string | null => {
  if (!layoutId || edit !== "true" || !layouts.some((layout) => layout.id === layoutId)) return null;
  return layoutId;
};

export const getLayoutIdForViewportWidth = (layouts: readonly ResponsiveLayout[], viewportWidth: number): string => {
  if (layouts.length === 0) {
    throw new Error("Expected the board to contain a layout");
  }

  const normalizedWidth = Number.isFinite(viewportWidth) ? Math.max(0, viewportWidth) : 0;
  const sortedLayouts = layouts.toSorted((layoutA, layoutB) => layoutB.breakpoint - layoutA.breakpoint);
  const selected = sortedLayouts.find((layout) => layout.breakpoint <= normalizedWidth) ?? sortedLayouts.at(-1);
  if (!selected) {
    throw new Error("Expected the board to contain a layout");
  }

  return selected.id;
};
