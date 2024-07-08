import { createCronJob } from "../lib";
import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import SuperJSON from "superjson";

// This import is done that way to avoid circular dependencies.
import type { WidgetComponentProps } from "../../../widgets";
import type { FeedData } from "@extractus/feed-extractor";
import { extract } from "@extractus/feed-extractor";
import { createItemChannel } from "@homarr/redis";

export const rssFeedsJob = createCronJob("rssFeeds", EVERY_5_MINUTES).withCallback(async () => {
  const itemsForIntegration = await db.query.items.findMany({
    where: eq(items.kind, "rssFeed"),
  });

  for (const item of itemsForIntegration) {
    const options = SuperJSON.parse<WidgetComponentProps<"rssFeed">["options"]>(item.options);

    const feeds = await Promise.all(options.feedUrls.map(async (feedUrl) => ({
      itemId: item.id,
      feedUrl,
      feed: await extract(feedUrl)
    })));

    const channel = createItemChannel<RssFeed[]>(item.id);
    await channel.publishAndUpdateLastStateAsync(feeds);
  }
});

export interface RssFeed {
  feedUrl: string;
  feed: FeedData;
}

