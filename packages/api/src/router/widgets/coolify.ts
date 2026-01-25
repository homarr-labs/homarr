import { observable } from "@trpc/server/observable";

import type { CoolifyInstanceInfo } from "@homarr/integrations/types";
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
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

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
  subscribeInstancesInfo: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "coolify"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; instanceInfo: CoolifyInstanceInfo; timestamp: Date }>((emit) => {
        const unsubscribes = ctx.integrations.map((integration) => {
          const innerHandler = coolifyRequestHandler.handler(integration, {});
          return innerHandler.subscribe((instanceInfo) => {
            emit.next({
              integrationId: integration.id,
              instanceInfo,
              timestamp: new Date(),
            });
          });
        });

        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      });
    }),
});
