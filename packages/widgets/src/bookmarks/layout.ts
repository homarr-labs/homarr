import type { WidgetComponentProps } from "../definition";

export type BookmarkLayout = WidgetComponentProps<"bookmarks">["options"]["layout"];
export type BookmarkOrientation = "horizontal" | "vertical" | "icon";

export interface BookmarkDisplayPlan {
  columns: number;
  horizontalScroll: boolean;
  itemGap: number;
  itemHeight: number;
  itemWidth: number;
  orientation: BookmarkOrientation;
  showHostname: boolean;
  showTitle: boolean;
}

export interface BookmarkCardDisplay {
  orientation: BookmarkOrientation;
  showHostname: boolean;
  showIcon: boolean;
  showTitle: boolean;
}

export const getBookmarkCardDisplay = ({
  advanced,
  hideHostname,
  hideIcon,
  hideTitle,
  plan,
}: {
  advanced: boolean;
  hideHostname: boolean;
  hideIcon: boolean;
  hideTitle: boolean;
  plan: BookmarkDisplayPlan;
}): BookmarkCardDisplay => {
  let orientation = plan.orientation;
  let showTitle = advanced || (!hideTitle && plan.showTitle);
  if (!advanced && hideIcon && !hideTitle && !showTitle) {
    orientation = "horizontal";
    showTitle = true;
  }
  const showHostname = advanced || (!hideHostname && plan.showHostname);
  const showIcon = advanced || !hideIcon || (!showTitle && !showHostname);

  return { orientation, showHostname, showIcon, showTitle };
};

interface BookmarkWidthBreakpoint {
  adaptiveColumns: number;
  adaptiveOrientation: BookmarkOrientation;
  advancedColumns: number;
  compactColumns: number;
  gridColumns: number;
  iconColumns: number;
  minWidth: number;
  rowItemWidth: number;
  showHostname: boolean;
  showTitle: boolean;
}

const widthBreakpoints = [
  {
    minWidth: 900,
    adaptiveColumns: 4,
    advancedColumns: 3,
    compactColumns: 4,
    gridColumns: 5,
    iconColumns: 10,
    rowItemWidth: 180,
    adaptiveOrientation: "vertical",
    showHostname: true,
    showTitle: true,
  },
  {
    minWidth: 720,
    adaptiveColumns: 3,
    advancedColumns: 2,
    compactColumns: 3,
    gridColumns: 4,
    iconColumns: 8,
    rowItemWidth: 172,
    adaptiveOrientation: "horizontal",
    showHostname: true,
    showTitle: true,
  },
  {
    minWidth: 480,
    adaptiveColumns: 2,
    advancedColumns: 2,
    compactColumns: 2,
    gridColumns: 3,
    iconColumns: 6,
    rowItemWidth: 160,
    adaptiveOrientation: "horizontal",
    showHostname: true,
    showTitle: true,
  },
  {
    minWidth: 300,
    adaptiveColumns: 2,
    advancedColumns: 1,
    compactColumns: 1,
    gridColumns: 2,
    iconColumns: 4,
    rowItemWidth: 144,
    adaptiveOrientation: "horizontal",
    showHostname: false,
    showTitle: true,
  },
  {
    minWidth: 180,
    adaptiveColumns: 1,
    advancedColumns: 1,
    compactColumns: 1,
    gridColumns: 1,
    iconColumns: 3,
    rowItemWidth: 136,
    adaptiveOrientation: "horizontal",
    showHostname: false,
    showTitle: true,
  },
  {
    minWidth: 0,
    adaptiveColumns: 1,
    advancedColumns: 1,
    compactColumns: 1,
    gridColumns: 1,
    iconColumns: 2,
    rowItemWidth: 112,
    adaptiveOrientation: "icon",
    showHostname: false,
    showTitle: false,
  },
] as const satisfies readonly BookmarkWidthBreakpoint[];

interface BookmarkHeightBreakpoint {
  columnItemHeight: number;
  itemHeight: number;
  minHeight: number;
  orientation: BookmarkOrientation;
  rowItemHeight: number;
  showHostname: boolean;
  showTitle: boolean;
}

const heightBreakpoints = [
  {
    minHeight: 300,
    columnItemHeight: 72,
    itemHeight: 128,
    rowItemHeight: 128,
    orientation: "vertical",
    showHostname: true,
    showTitle: true,
  },
  {
    minHeight: 180,
    columnItemHeight: 64,
    itemHeight: 128,
    rowItemHeight: 112,
    orientation: "horizontal",
    showHostname: true,
    showTitle: true,
  },
  {
    minHeight: 110,
    columnItemHeight: 56,
    itemHeight: 80,
    rowItemHeight: 80,
    orientation: "horizontal",
    showHostname: false,
    showTitle: true,
  },
  {
    minHeight: 60,
    columnItemHeight: 48,
    itemHeight: 48,
    rowItemHeight: 56,
    orientation: "icon",
    showHostname: false,
    showTitle: false,
  },
  {
    minHeight: 0,
    columnItemHeight: 32,
    itemHeight: 32,
    rowItemHeight: 40,
    orientation: "icon",
    showHostname: false,
    showTitle: false,
  },
] as const satisfies readonly BookmarkHeightBreakpoint[];

export const getBookmarkDisplayPlan = ({
  advanced,
  gap = 0,
  height,
  itemCount,
  layout,
  width,
}: {
  advanced: boolean;
  gap?: number;
  height: number;
  itemCount: number;
  layout: BookmarkLayout;
  width: number;
}): BookmarkDisplayPlan => {
  const count = Math.max(1, itemCount);
  const normalizedWidth = Math.max(0, width);
  const normalizedHeight = Math.max(0, height);
  const widthSettings = widthBreakpoints.find(({ minWidth }) => normalizedWidth >= minWidth);
  const heightSettings = heightBreakpoints.find(({ minHeight }) => normalizedHeight >= minHeight);
  if (!widthSettings || !heightSettings) throw new Error("Bookmark breakpoints must cover all widget sizes");

  if (advanced) {
    return {
      columns: Math.min(count, widthSettings.advancedColumns),
      horizontalScroll: false,
      itemGap: gap,
      itemHeight: 104,
      itemWidth: 260,
      orientation: "horizontal",
      showHostname: true,
      showTitle: true,
    };
  }

  if (layout === "row") {
    let orientation: BookmarkOrientation = "horizontal";
    if (!widthSettings.showTitle) orientation = "icon";
    let itemWidth: number = widthSettings.rowItemWidth;
    if (heightSettings.rowItemHeight <= 56) itemWidth = 112;
    if (heightSettings.rowItemHeight <= 40) itemWidth = 96;
    return {
      columns: count,
      horizontalScroll: true,
      itemGap: Math.min(gap, 8),
      itemHeight: Math.min(heightSettings.rowItemHeight, 64),
      itemWidth,
      orientation,
      showHostname: widthSettings.showHostname && heightSettings.showHostname,
      showTitle: widthSettings.showTitle,
    };
  }

  if (layout === "column") {
    const densitySettings = getBookmarkDensitySettings({
      columns: 1,
      gap,
      height: normalizedHeight,
      heightProperty: "columnItemHeight",
      itemCount: count,
      preferredSettings: heightSettings,
    });
    return {
      columns: 1,
      horizontalScroll: false,
      itemGap: getBookmarkDensityGap(gap, densitySettings),
      itemHeight: densitySettings.columnItemHeight,
      itemWidth: width,
      orientation: "horizontal",
      showHostname: widthSettings.showHostname && densitySettings.showHostname,
      showTitle: widthSettings.showTitle && densitySettings.showTitle,
    };
  }

  if (layout === "icons") {
    return {
      columns: Math.min(count, widthSettings.iconColumns),
      horizontalScroll: false,
      itemGap: Math.min(gap, 8),
      itemHeight: 56,
      itemWidth: 56,
      orientation: "icon",
      showHostname: false,
      showTitle: false,
    };
  }

  if (layout === "gridHorizontal") {
    return {
      columns: Math.min(count, widthSettings.compactColumns),
      horizontalScroll: false,
      itemGap: Math.min(gap, 8),
      itemHeight: 56,
      itemWidth: widthSettings.rowItemWidth,
      orientation: "horizontal",
      showHostname: widthSettings.showHostname && heightSettings.showHostname,
      showTitle: widthSettings.showTitle && heightSettings.showTitle,
    };
  }

  let columns: number = widthSettings.adaptiveColumns;
  let orientation: BookmarkOrientation = widthSettings.adaptiveOrientation;
  if (layout === "grid") {
    columns = widthSettings.gridColumns;
    orientation = "vertical";
  }
  if (layout === "adaptive") {
    columns = widthSettings.adaptiveColumns;
    orientation = widthSettings.adaptiveOrientation;
    if (heightSettings.orientation === "icon") orientation = "icon";
    if (heightSettings.orientation === "horizontal" && orientation === "vertical") orientation = "horizontal";
  }

  const visibleColumns = Math.min(count, columns);
  const densitySettings = getBookmarkDensitySettings({
    columns: visibleColumns,
    gap,
    height: normalizedHeight,
    heightProperty: "itemHeight",
    itemCount: count,
    preferredSettings: heightSettings,
  });
  if (layout === "adaptive" && densitySettings.itemHeight < 80 && orientation === "vertical") {
    orientation = "horizontal";
  }

  let showHostname =
    orientation !== "icon" && widthSettings.showHostname && heightSettings.showHostname && densitySettings.showHostname;
  let showTitle = orientation !== "icon" && widthSettings.showTitle && heightSettings.showTitle;
  if (layout === "grid") {
    showHostname = showHostname && densitySettings.showHostname;
    showTitle = showTitle && densitySettings.showTitle;
    if (!showHostname && !showTitle) orientation = "icon";
  }

  return {
    columns: visibleColumns,
    horizontalScroll: false,
    itemGap: getBookmarkDensityGap(gap, densitySettings),
    itemHeight: densitySettings.itemHeight,
    itemWidth: widthSettings.rowItemWidth,
    orientation,
    showHostname,
    showTitle,
  };
};

type BookmarkHeightProperty = "columnItemHeight" | "itemHeight";
type BookmarkHeightSettings = (typeof heightBreakpoints)[number];

const getBookmarkDensitySettings = ({
  columns,
  gap,
  height,
  heightProperty,
  itemCount,
  preferredSettings,
}: {
  columns: number;
  gap: number;
  height: number;
  heightProperty: BookmarkHeightProperty;
  itemCount: number;
  preferredSettings: BookmarkHeightSettings;
}): BookmarkHeightSettings => {
  const rowCount = Math.ceil(itemCount / Math.max(1, columns));
  const totalGap = Math.max(0, rowCount - 1) * Math.max(0, gap);
  const preferredIndex = heightBreakpoints.indexOf(preferredSettings);
  const matchingSettings = heightBreakpoints
    .slice(preferredIndex)
    .find((settings) => rowCount * settings[heightProperty] + totalGap <= height);

  return matchingSettings ?? heightBreakpoints[4];
};

const getBookmarkDensityGap = (gap: number, settings: BookmarkHeightSettings) => {
  if (settings.itemHeight > 32 && settings.columnItemHeight > 32) return gap;
  return Math.min(gap, 4);
};
