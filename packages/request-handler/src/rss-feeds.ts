import type { FeedData, FeedEntry } from "@extractus/feed-extractor";
import { extract } from "@extractus/feed-extractor";
import { z } from "zod/v4";

import type { Modify } from "@homarr/common/types";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { createWidgetRequestHandler } from "./lib/widget-request-handler";

const logger = createLogger({ module: "rssFeedsRequestHandler" });

export const rssFeedsRequestHandler = createWidgetRequestHandler({
  // Authorized editors can supply arbitrary URLs, so keep this cache process-local and bounded.
  async requestAsync(input: { url: string; count: number; descriptionMaxLength: number }, signal) {
    const result = (await extract(
      input.url,
      {
        descriptionMaxLen: input.descriptionMaxLength,
        getExtraEntryFields: (feedEntry) => {
          const media = attemptGetImageFromEntry(input.url, feedEntry);
          if (!media) {
            return {};
          }
          return {
            enclosure: media,
          };
        },
      },
      { signal },
    )) as ExtendedFeedData;

    return {
      ...result,
      entries: result.entries?.map((entry) => ({ ...entry, feedUrl: input.url })).slice(0, input.count) ?? [],
    };
  },
});

const attemptGetImageFromEntry = (feedUrl: string, entry: object) => {
  const media = getFirstMediaProperty(entry);
  if (media !== null) {
    return media;
  }
  return getImageFromStringAsFallback(feedUrl, JSON.stringify(entry));
};

const getImageFromStringAsFallback = (feedUrl: string, content: string) => {
  const regex =
    /https?:\/\/[^\s"'<>\\]+?\.(jpg|jpeg|png|gif|bmp|svg|webp|tiff)\b(?:\?[^\s"'<>\\#]*)?(?:#[^\s"'<>\\]*)?/i;
  const result = regex.exec(content);

  if (result == null) {
    return null;
  }

  console.debug(
    `Falling back to regex image search for '${feedUrl}'. Found ${result.length} matches in content: ${content}`,
  );
  return result[0];
};

const mediaProperties = ["enclosure", "media:content", "media:thumbnail"] as const;

/**
 * The RSS and Atom standards are poorly adhered to in most of the web.
 * We want to show pretty background images on the posts and therefore need to extract
 * the enclosure (aka. media images). This function checks known media fields in priority
 * order and picks the first valid image URL from a field.
 * @param feedObject The object to scan for.
 * @returns the first valid media URL, or null when none is found
 */
const getFirstMediaProperty = (feedObject: object) => {
  for (const mediaProperty of mediaProperties) {
    const mediaValue: unknown = Object.entries(feedObject).find(([key]) => key === mediaProperty)?.[1];
    const mediaEntries: unknown[] = Array.isArray(mediaValue) ? mediaValue : [mediaValue];

    for (const mediaEntry of mediaEntries) {
      if (mediaEntry === null || typeof mediaEntry !== "object") {
        continue;
      }

      const url: unknown = Object.entries(mediaEntry).find(([key]) => key === "@_url")?.[1];
      const validationResult = z.string().url().safeParse(url);
      if (!validationResult.success) {
        continue;
      }

      logger.debug(`Found an image in the feed entry: ${validationResult.data}`);
      return validationResult.data;
    }
  }
  return null;
};

/**
 * We extend the feed with custom properties.
 * This interface adds properties on top of the default ones.
 */
export interface ExtendedFeedEntry extends FeedEntry {
  feedUrl: string;
  enclosure?: string;
}

/**
 * We extend the feed with custom properties.
 * This interface omits the default entries with our custom definition.
 */
type ExtendedFeedData = Modify<
  FeedData,
  {
    entries?: ExtendedFeedEntry[];
  }
>;

export interface RssFeed {
  feedUrl: string;
  feed: ExtendedFeedData;
}
