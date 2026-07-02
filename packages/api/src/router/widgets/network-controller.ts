import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { networkControllerRequestHandler } from "@homarr/request-handler/network-controller";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const networkControllerRouter = createTRPCRouter({
  summary: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("networkController")))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = networkControllerRequestHandler.handler(integration, {});
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          integration: {
            id: integration.id,
            name: integration.name,
            kind: integration.kind,
          },
          summary: data,
          updatedAt: timestamp,
        };
      });
    }),
});
