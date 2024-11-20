import { extract } from "@extractus/feed-extractor";

import { attemptGetImageFromEntry } from "./media";
import type { ExtendedFeedData } from "./types";

export type { ExtendedFeedData, RssFeed } from "./types";

export const getRssFeedAsync = async (url: string) => {
  return (await extract(url, {
    getExtraEntryFields: (feedEntry) => {
      const media = attemptGetImageFromEntry(url, feedEntry);
      if (!media) {
        return {};
      }
      return {
        enclosure: media,
      };
    },
  })) as ExtendedFeedData;
};
