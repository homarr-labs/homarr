const SHORT_HEIGHT_BREAKPOINT = 120;
const NARROW_SHORT_WIDTH_BREAKPOINT = 120;
const SHORT_ICON_SIZE = 14;
const NARROW_SHORT_ICON_SIZE = 12;

export type CompactStatLayoutState = "default" | "short" | "narrowShort";

interface CompactStatLayoutInput {
  width: number;
  height: number;
  visibleCount: number;
  /** Compact board display mode, independent of widget-specific compact styling options. */
  compactDisplay: boolean;
  defaultColumns: number;
  defaultIconSize: number;
}

interface CompactStatLayout {
  state: CompactStatLayoutState;
  columns: number;
  iconSize: number;
}

export function getCompactStatLayout({
  width,
  height,
  visibleCount,
  compactDisplay,
  defaultColumns,
  defaultIconSize,
}: CompactStatLayoutInput): CompactStatLayout {
  if (!compactDisplay || height >= SHORT_HEIGHT_BREAKPOINT) {
    return {
      state: "default",
      columns: defaultColumns,
      iconSize: defaultIconSize,
    };
  }

  if (width < NARROW_SHORT_WIDTH_BREAKPOINT) {
    return {
      state: "narrowShort",
      columns: 1,
      iconSize: NARROW_SHORT_ICON_SIZE,
    };
  }

  return {
    state: "short",
    columns: Math.max(visibleCount, 1),
    iconSize: SHORT_ICON_SIZE,
  };
}
