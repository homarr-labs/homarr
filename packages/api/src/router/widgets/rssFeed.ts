import type { RssFeed } from "@homarr/cron-jobs";
import { createItemChannel } from "@homarr/redis";

import { createOneItemMiddleware } from "../../middlewares/item";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const rssFeedRouter = createTRPCRouter({
  getFeeds: protectedProcedure.unstable_concat(createOneItemMiddleware("rssFeed")).query(async ({ input }) => {
    const channel = createItemChannel<RssFeed[]>(input.itemId);
    return await channel.getAsync();
  }),
});
