import type { FeedData, FeedEntry } from "@extractus/feed-extractor";

import type { Modify } from "@homarr/common/types";

/**
 * We extend the feed with custom properties.
 * This interface adds properties on top of the default ones.
 */
interface ExtendedFeedEntry extends FeedEntry {
  enclosure?: string;
}

/**
 * We extend the feed with custom properties.
 * This interface omits the default entries with our custom definition.
 */
export type ExtendedFeedData = Modify<
  FeedData,
  {
    entries?: ExtendedFeedEntry[];
  }
>;

export interface RssFeed {
  feedUrl: string;
  feed: ExtendedFeedData;
}
