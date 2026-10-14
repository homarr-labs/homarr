export interface BookmarkItem {
  id: string;
  name: string;
  description: string | null;
  iconUrl?: string;
  href: string | null;
}

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
