import { z } from "zod/v4";

import { navidromeRequestHandler } from "@homarr/request-handler/navidrome";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const navidromeRouter = createTRPCRouter({
  getStats: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "navidrome"))
    .input(
      z.object({
        integrationId: z.string(),
      }),
    )
    .query(async ({ ctx }) => {
      const innerHandler = navidromeRequestHandler.handler(ctx.integration, {});
      const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data.data;
    }),
});
