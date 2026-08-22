import type { WidgetComponentProps } from "../definition";

export type BookmarkLayout = WidgetComponentProps<"bookmarks">["options"]["layout"];
export type BookmarkOrientation = "horizontal" | "vertical" | "icon";

export interface BookmarkDisplayPlan {
  columns: number;
  horizontalScroll: boolean;
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
    minHeight: 0,
    columnItemHeight: 48,
    itemHeight: 56,
    rowItemHeight: 56,
    orientation: "icon",
    showHostname: false,
    showTitle: false,
  },
] as const satisfies readonly BookmarkHeightBreakpoint[];

export const getBookmarkDisplayPlan = ({
  advanced,
  height,
  itemCount,
  layout,
  width,
}: {
  advanced: boolean;
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
      itemHeight: 104,
      itemWidth: 260,
      orientation: "horizontal",
      showHostname: true,
      showTitle: true,
    };
  }

  if (layout === "row") {
    let orientation: BookmarkOrientation = "vertical";
    if (!heightSettings.showTitle) orientation = "icon";
    return {
      columns: count,
      horizontalScroll: true,
      itemHeight: heightSettings.rowItemHeight,
      itemWidth: widthSettings.rowItemWidth,
      orientation,
      showHostname: widthSettings.showHostname && heightSettings.showHostname,
      showTitle: widthSettings.showTitle && heightSettings.showTitle,
    };
  }

  if (layout === "column") {
    return {
      columns: 1,
      horizontalScroll: false,
      itemHeight: heightSettings.columnItemHeight,
      itemWidth: width,
      orientation: "horizontal",
      showHostname: widthSettings.showHostname && heightSettings.showHostname,
      showTitle: widthSettings.showTitle && heightSettings.showTitle,
    };
  }

  if (layout === "icons") {
    return {
      columns: Math.min(count, widthSettings.iconColumns),
      horizontalScroll: false,
      itemHeight: 56,
      itemWidth: 56,
      orientation: "icon",
      showHostname: false,
      showTitle: false,
    };
  }

  let columns: number = widthSettings.compactColumns;
  let orientation: BookmarkOrientation = "horizontal";
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

  return {
    columns: Math.min(count, columns),
    horizontalScroll: false,
    itemHeight: heightSettings.itemHeight,
    itemWidth: widthSettings.rowItemWidth,
    orientation,
    showHostname: orientation !== "icon" && widthSettings.showHostname && heightSettings.showHostname,
    showTitle: orientation !== "icon" && widthSettings.showTitle && heightSettings.showTitle,
  };
};
