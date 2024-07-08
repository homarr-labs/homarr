import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { createOneItemMiddleware } from "../../middlewares/item";

export const rssFeedRouter = createTRPCRouter({
  getFeeds: protectedProcedure
    .unstable_concat(createOneItemMiddleware("rssFeed"))
    .query(async ({ ctx, input }) => {

  })
});
