import type { FeedData, FeedEntry } from "@extractus/feed-extractor";
import { extract } from "@extractus/feed-extractor";
import SuperJSON from "superjson";

import type { Modify } from "@homarr/common/types";
import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema";
import { logger } from "@homarr/log";
import { createItemChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

// This import is done that way to avoid circular dependencies.
import type { WidgetComponentProps } from "../../../widgets";
import { createCronJob } from "../lib";

export const rssFeedsJob = createCronJob("rssFeeds", EVERY_5_MINUTES).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "rssFeed"),
  });

  for (const item of itemsForIntegration) {
    const options = SuperJSON.parse<WidgetComponentProps<"rssFeed">["options"]>(item.options);

    const feeds = await Promise.all(
      options.feedUrls.map(async (feedUrl) => ({
        feedUrl,
        feed: (await extract(feedUrl, {
          getExtraEntryFields: (feedEntry) => {
            const media = attemptGetImageFromEntry(feedUrl, feedEntry);
            if (!media) {
              return {};
            }
            return {
              enclosure: media,
            };
          },
        })) as ExtendedFeedData,
      })),
    );

    const channel = createItemChannel<RssFeed[]>(item.id);
    await channel.publishAndUpdateLastStateAsync(feeds);
  }
});

const attemptGetImageFromEntry = (feedUrl: string, entry: object) => {
  const media = getFirstMediaProperty(entry);
  if (media !== null) {
    return media;
  }
  return getImageFromStringAsFallback(feedUrl, JSON.stringify(entry));
};

const getImageFromStringAsFallback = (feedUrl: string, content: string) => {
  const regex = /https?:\/\/\S+?\.(jpg|jpeg|png|gif|bmp|svg|webp|tiff)/i;
  const result = regex.exec(content);

  if (result == null) {
    return null;
  }

  console.debug(
    `Falling back to regex image search for '${feedUrl}'. Found ${result.length} matches in content: ${content}`,
  );
  return result[0];
};

const mediaProperties = [
  {
    path: ["enclosure", "@_url"],
  },
  {
    path: ["media:content", "@_url"],
  },
];

/**
 * The RSS and Atom standards are poorly adhered to in most of the web.
 * We want to show pretty background images on the posts and therefore need to extract
 * the enclosure (aka. media images). This function uses the dynamic properties defined above
 * to search through the possible paths and detect valid image URLs.
 * @param feedObject The object to scan for.
 * @returns the value of the first path that is found within the object
 */
const getFirstMediaProperty = (feedObject: object) => {
  for (const mediaProperty of mediaProperties) {
    let propertyIndex = 0;
    let objectAtPath: object = feedObject;
    while (propertyIndex < mediaProperty.path.length) {
      const key = mediaProperty.path[propertyIndex];
      if (key === undefined) {
        break;
      }
      const propertyEntries = Object.entries(objectAtPath);
      const propertyEntry = propertyEntries.find(([entryKey]) => entryKey === key);
      if (!propertyEntry) {
        break;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const [_, propertyEntryValue] = propertyEntry;
      objectAtPath = propertyEntryValue as object;
      propertyIndex++;
    }

    const validationResult = z.string().url().safeParse(objectAtPath);
    if (!validationResult.success) {
      continue;
    }

    logger.debug(`Found an image in the feed entry: ${validationResult.data}`);
    return validationResult.data;
  }
  return null;
};

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
type ExtendedFeedData = Modify<
  FeedData,
  {
    entries?: ExtendedFeedEntry;
  }
>;

export interface RssFeed {
  feedUrl: string;
  feed: ExtendedFeedData;
}
