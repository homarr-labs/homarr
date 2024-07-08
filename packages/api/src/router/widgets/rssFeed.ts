import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { createOneItemMiddleware } from "../../middlewares/item";
import { createItemChannel } from "@homarr/redis";
import type { RssFeed } from "@homarr/cron-jobs";

export const rssFeedRouter = createTRPCRouter({
  getFeeds: protectedProcedure
    .unstable_concat(createOneItemMiddleware("rssFeed"))
    .query(async ({ input }) => {
      const channel = createItemChannel<RssFeed>(input.itemId);
      return channel.getAsync();
  })
});
