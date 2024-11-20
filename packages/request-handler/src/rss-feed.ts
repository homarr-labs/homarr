import dayjs from "dayjs";

import { createChannelWithLatestAndEvents } from "@homarr/redis";
import type { ExtendedFeedData } from "@homarr/rss";
import { getRssFeedAsync } from "@homarr/rss";

import { createCachedRequestHandler } from "./lib/cached-request-handler";

export const rssFeedRequestHandler = createCachedRequestHandler<ExtendedFeedData, { url: string }>({
  createRedisChannel: (input) => {
    const base64Url = Buffer.from(input.url).toString("base64");
    return createChannelWithLatestAndEvents(`rssFeed:${base64Url}`);
  },
  async requestAsync(input) {
    return await getRssFeedAsync(input.url);
  },
  cacheDuration: dayjs.duration(5, "minutes"),
  queryKey: "rssFeeds",
});
