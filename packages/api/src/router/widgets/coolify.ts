import { observable } from "@trpc/server/observable";

import type { CoolifyInstanceInfo } from "@homarr/integrations/types";
import { coolifyRequestHandler } from "@homarr/request-handler/coolify";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const coolifyRouter = createTRPCRouter({
  getInstanceInfo: publicProcedure.concat(createOneIntegrationMiddleware("query", "coolify")).query(async ({ ctx }) => {
    const innerHandler = coolifyRequestHandler.handler(ctx.integration, {});
    const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

    return {
      integrationId: ctx.integration.id,
      integrationName: ctx.integration.name,
      instanceInfo: data,
      updatedAt: timestamp,
    };
  }),
  subscribeInstanceInfo: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "coolify"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; instanceInfo: CoolifyInstanceInfo; timestamp: Date }>((emit) => {
        const innerHandler = coolifyRequestHandler.handler(ctx.integration, {});
        const unsubscribe = innerHandler.subscribe((instanceInfo) => {
          emit.next({
            integrationId: ctx.integration.id,
            instanceInfo,
            timestamp: new Date(),
          });
        });
        return () => {
          unsubscribe();
        };
      });
    }),
});
