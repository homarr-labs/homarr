import { bazarrBadgesRequestHandler } from "@homarr/request-handler/bazarr";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const bazarrRouter = createTRPCRouter({
  getBadges: publicProcedure.concat(createOneIntegrationMiddleware("query", "bazarr")).query(async ({ ctx }) => {
    const innerHandler = bazarrBadgesRequestHandler.handler(ctx.integration, {});
    const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data.data;
  }),
});
