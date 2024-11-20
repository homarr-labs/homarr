import { observable } from "@trpc/server/observable";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import { smartHomeEntityStateRequestHandler } from "@homarr/request-handler/smart-home-entity-state";
import { z } from "@homarr/validation";

import type { IntegrationAction } from "../../middlewares/integration";
import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createSmartHomeIntegrationMiddleware = (action: IntegrationAction) =>
  createOneIntegrationMiddleware(action, ...getIntegrationKindsByCategory("smartHomeServer"));

export const smartHomeRouter = createTRPCRouter({
  entityState: publicProcedure
    .input(z.object({ entityId: z.string() }))
    .unstable_concat(createSmartHomeIntegrationMiddleware("query"))
    .query(async ({ ctx: { integration }, input }) => {
      const innerHandler = smartHomeEntityStateRequestHandler.handler(integration, { entityId: input.entityId });
      const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data;
    }),
  subscribeEntityState: publicProcedure
    .unstable_concat(createSmartHomeIntegrationMiddleware("query"))
    .input(z.object({ entityId: z.string() }))
    .subscription(({ input, ctx }) => {
      return observable<{
        entityId: string;
        state: string;
      }>((emit) => {
        const innerHandler = smartHomeEntityStateRequestHandler.handler(ctx.integration, {
          entityId: input.entityId,
        });
        const unsubscribe = innerHandler.subscribe((state) => {
          emit.next({ state, entityId: input.entityId });
        });

        return () => {
          unsubscribe();
        };
      });
    }),
  switchEntity: publicProcedure
    .unstable_concat(createSmartHomeIntegrationMiddleware("interact"))
    .input(z.object({ entityId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = integrationCreator(integration);
      const success = await client.triggerToggleAsync(input.entityId);

      const innerHandler = smartHomeEntityStateRequestHandler.handler(integration, { entityId: input.entityId });
      await innerHandler.invalidateAsync();

      return success;
    }),
  executeAutomation: publicProcedure
    .unstable_concat(createSmartHomeIntegrationMiddleware("interact"))
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = integrationCreator(integration);
      await client.triggerAutomationAsync(input.automationId);
    }),
});
