import { observable } from "@trpc/server/observable";
import z from "zod";

import { createIntegrationAsync } from "@homarr/integrations";
import type { System } from "@homarr/integrations/types";
import { systemUsageRequestHandler } from "@homarr/request-handler/system-usage";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

const supportedIntegrations = ["beszel"] as const;

export const systemUsageRouter = createTRPCRouter({
  listSystems: protectedProcedure
    .concat(createOneIntegrationMiddleware("use", ...supportedIntegrations))
    .query(async ({ ctx: { integration } }) => {
      const instance = await createIntegrationAsync(integration);

      return await instance.getSystemsAsync();
    }),
  get: publicProcedure
    .input(z.object({ systemId: z.string() }))
    .concat(createOneIntegrationMiddleware("query", ...supportedIntegrations))
    .query(async ({ ctx: { integration }, input }) => {
      const innerHandler = systemUsageRequestHandler.handler(integration, { systemId: input.systemId });
      const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),
  subscribe: publicProcedure
    .concat(createOneIntegrationMiddleware("query", ...supportedIntegrations))
    .input(z.object({ systemId: z.string() }))
    .subscription(({ input, ctx }) => {
      return observable<{
        system: System;
      }>((emit) => {
        const innerHandler = systemUsageRequestHandler.handler(ctx.integration, {
          systemId: input.systemId,
        });
        const unsubscribe = innerHandler.subscribe((system) => {
          emit.next({ system });
        });

        return () => {
          unsubscribe();
        };
      });
    }),
});
