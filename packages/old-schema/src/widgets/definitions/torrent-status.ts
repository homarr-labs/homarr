import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrTorrentStatusDefinition
  extends CommonOldmarrWidgetDefinition<
    "torrents-status",
    {
      displayCompletedTorrents: boolean;
      displayActiveTorrents: boolean;
      speedLimitOfActiveTorrents: number;
      displayStaleTorrents: boolean;
      labelFilterIsWhitelist: boolean;
      labelFilter: string[];
      displayRatioWithFilter: boolean;
      columnOrdering: boolean;
      rowSorting: boolean;
      columns: ("up" | "down" | "eta" | "progress")[];
      nameColumnSize: number;
    }
  > {}
