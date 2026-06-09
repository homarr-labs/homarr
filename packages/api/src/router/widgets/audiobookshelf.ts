import { audiobookshelfRequestHandler } from "@homarr/request-handler/audiobookshelf";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const audiobookshelfRouter = createTRPCRouter({
  getStats: publicProcedure.concat(createOneIntegrationMiddleware("query", "audiobookshelf")).query(async ({ ctx }) => {
    const innerHandler = audiobookshelfRequestHandler.handler(ctx.integration, {});
    const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data.data;
  }),
});
