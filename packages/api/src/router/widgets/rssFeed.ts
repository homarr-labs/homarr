import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { createOneItemMiddleware } from "../../middlewares/integration";

export const rssFeedRouter = createTRPCRouter({
  getFeeds: protectedProcedure.unstable_concat(createOneItemMiddleware()).query(async ({ ctx, input }) => {

  })
});
