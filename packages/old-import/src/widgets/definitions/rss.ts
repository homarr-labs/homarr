import type { CommonOldmarrWidgetDefinition } from "./common";

export type OldmarrRssDefinition = CommonOldmarrWidgetDefinition<
  "rss",
  {
    rssFeedUrl: string[];
    refreshInterval: number;
    dangerousAllowSanitizedItemContent: boolean;
    textLinesClamp: number;
    sortByPublishDateAscending: boolean;
    sortPostsWithoutPublishDateToTheTop: boolean;
    maximumAmountOfPosts: number;
  }
>;
