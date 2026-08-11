import { komodoOverviewRequestHandler, komodoServerOverviewRequestHandler } from "@homarr/request-handler/komodo";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const komodoRouter = createTRPCRouter({
  getOverview: publicProcedure.concat(createOneIntegrationMiddleware("query", "komodo")).query(async ({ ctx }) => {
    const handler = komodoOverviewRequestHandler.handler(ctx.integration, {});
    const { data, timestamp } = await handler.getDataAsync();

    return {
      overview: data,
      updatedAt: timestamp,
    };
  }),
  getServers: publicProcedure.concat(createOneIntegrationMiddleware("query", "komodo")).query(async ({ ctx }) => {
    const handler = komodoServerOverviewRequestHandler.handler(ctx.integration, {});
    const { data, timestamp } = await handler.getDataAsync();

    return {
      servers: data,
      updatedAt: timestamp,
    };
  }),
});
