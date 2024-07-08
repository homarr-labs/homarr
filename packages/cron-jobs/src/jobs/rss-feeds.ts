import { createCronJob } from "../lib";
import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import SuperJSON from "superjson";

// This import is done that way to avoid circular dependencies.
import type { WidgetComponentProps } from "../../../widgets";

import type { FeedData, FeedEntry } from "@extractus/feed-extractor";
import { extract } from "@extractus/feed-extractor";
import { createItemChannel } from "@homarr/redis";
import { z } from "@homarr/validation";
import { logger } from "@homarr/log";

export const rssFeedsJob = createCronJob("rssFeeds", EVERY_5_MINUTES).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "rssFeed"),
  });

  for (const item of itemsForIntegration) {
    const options = SuperJSON.parse<WidgetComponentProps<"rssFeed">["options"]>(item.options);

    const feeds = await Promise.all(options.feedUrls.map(async (feedUrl) => ({
      feedUrl,
      feed: (await extract(feedUrl, {
        getExtraEntryFields: (feedEntry) => {
          const media = getFirstMediaProperty(feedEntry);
          if (!media) {
            return {};
          }
          logger.info('found media: ' + media);
          return {
            enclosure: media
          }
        }
      })) as ExtendedFeedData
    })));

    const channel = createItemChannel<RssFeed[]>(item.id);
    await channel.publishAndUpdateLastStateAsync(feeds);
  }
});

const mediaProperties = [
  {
    path: ["media:content", "@_url"]
  }
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
    while(propertyIndex < mediaProperty.path.length) {
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

    logger.debug(`Found an image in the feed entry: ${validationResult.data}`)
    return validationResult.data;
  }
  return null;
}

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
interface ExtendedFeedData extends Omit<FeedData, 'entries'> {
  entries?: ExtendedFeedEntry;
}

export interface RssFeed {
  feedUrl: string;
  feed: ExtendedFeedData;
}

