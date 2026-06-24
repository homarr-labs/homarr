import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { networkControllerRequestHandler } from "@homarr/request-handler/network-controller";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const networkControllerRouter = createTRPCRouter({
  summary: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("networkController")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
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
        }),
      );
      return results;
    }),
});
