import SuperJSON from "superjson";

import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { db, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { rssFeedRequestHandler } from "@homarr/request-handler/rss-feed";

// This import is done that way to avoid circular dependencies.
import type { WidgetComponentProps } from "../../../widgets";
import { createCronJob } from "../lib";

export const rssFeedsJob = createCronJob("rssFeeds", EVERY_5_MINUTES).withCallback(async () => {
  const rssFeedItems = await db.query.items.findMany({
    where: eq(items.kind, "rssFeed"),
  });

  for (const item of rssFeedItems) {
    const options = SuperJSON.parse<WidgetComponentProps<"rssFeed">["options"]>(item.options);

    await Promise.allSettled(
      options.feedUrls.map(async (feedUrl) =>
        rssFeedRequestHandler.handler({ url: feedUrl }).getCachedOrUpdatedDataAsync({ forceUpdate: true }),
      ),
    );
  }
});
