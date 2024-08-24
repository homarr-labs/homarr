import type { RssFeed } from "@homarr/cron-jobs";
import { createItemChannel } from "@homarr/redis";

import { createOneItemMiddleware } from "../../middlewares/item";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const rssFeedRouter = createTRPCRouter({
  getFeeds: publicProcedure.unstable_concat(createOneItemMiddleware("rssFeed")).query(async ({ input }) => {
    const channel = createItemChannel<RssFeed[]>(input.itemId);
    return await channel.getAsync();
  }),
});
