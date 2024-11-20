import { z } from "zod";

import { logger } from "@homarr/log";

export const attemptGetImageFromEntry = (feedUrl: string, entry: object) => {
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

  logger.debug(
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
