import { rssFeedRequestHandler } from "@homarr/request-handler/rss-feed";
import type { RssFeed } from "@homarr/rss";
import { z } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const rssFeedRouter = createTRPCRouter({
  getFeeds: publicProcedure.input(z.object({ feedUrls: z.array(z.string()) })).query(async ({ input }) => {
    return Promise.all(
      input.feedUrls.map(async (feedUrl) => {
        const innerHandler = rssFeedRequestHandler.handler({ url: feedUrl });
        const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: true });
        return {
          feedUrl,
          feed: data,
        } satisfies RssFeed;
      }),
    );
  }),
});
