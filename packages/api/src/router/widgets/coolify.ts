import { coolifyRequestHandler } from "@homarr/request-handler/coolify";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const coolifyRouter = createTRPCRouter({
  getInstancesInfo: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "coolify"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = coolifyRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            instanceInfo: data,
            updatedAt: timestamp,
          };
        }),
      );

      return results;
    }),
});
