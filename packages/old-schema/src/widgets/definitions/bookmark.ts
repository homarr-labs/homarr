import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrBookmarkDefinition
  extends CommonOldmarrWidgetDefinition<
    "bookmark",
    {
      name: string;
      items: {
        id: string;
        name: string;
        href: string;
        iconUrl: string;
        openNewTab: boolean;
        hideHostname: boolean;
        hideIcon: boolean;
      }[];
      layout: "autoGrid" | "horizontal" | "vertical";
    }
  > {}
