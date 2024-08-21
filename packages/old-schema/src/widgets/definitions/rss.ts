import { CommonOldmarrWidgetDefinition } from "./common";

export interface OldmarrRssDefinition
  extends CommonOldmarrWidgetDefinition<
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
  > {}
