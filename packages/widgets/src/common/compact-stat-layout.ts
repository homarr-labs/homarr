const SHORT_HEIGHT_BREAKPOINT = 120;
const NARROW_SHORT_WIDTH_BREAKPOINT = 120;
const NARROW_SHORT_ICON_SIZE = 12;
const SHORT_GRID_HORIZONTAL_INSET = 8;
const SHORT_GRID_GAP = 2;
const SHORT_ICON_WIDTH_RATIO = 0.44;
const SHORT_ICON_SIZE_CAP = 40;

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
  if (!compactDisplay) {
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

  if (height >= SHORT_HEIGHT_BREAKPOINT) {
    return {
      state: "default",
      columns: defaultColumns,
      iconSize: defaultIconSize,
    };
  }

  return {
    state: "short",
    columns: Math.max(visibleCount, 1),
    iconSize: getShortIconSize(width, visibleCount, defaultIconSize),
  };
}

function getShortIconSize(width: number, visibleCount: number, defaultIconSize: number): number {
  const statCount = Math.max(visibleCount, 1);
  const totalGridGap = Math.max(statCount - 1, 0) * SHORT_GRID_GAP;
  const availableWidth = Math.max(width - SHORT_GRID_HORIZONTAL_INSET - totalGridGap, 0);
  const availableWidthPerStat = availableWidth / statCount;
  const proportionalIconSize = Math.round(availableWidthPerStat * SHORT_ICON_WIDTH_RATIO);
  const cappedIconSize = Math.min(proportionalIconSize, SHORT_ICON_SIZE_CAP);
  return Math.max(defaultIconSize, cappedIconSize);
}
