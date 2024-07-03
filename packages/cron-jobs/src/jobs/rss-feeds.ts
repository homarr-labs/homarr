import { createCronJob } from "../lib";
import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { extract } from '@extractus/feed-extractor'
import { logger } from "@homarr/log";

export const rssFeedsJob = createCronJob("rssFeeds", EVERY_5_MINUTES).withCallback(async () => {
  const feed = await extract("https://news.google.com/atom");
  logger.info(feed);
})
