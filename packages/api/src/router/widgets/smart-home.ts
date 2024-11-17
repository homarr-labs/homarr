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
      const innerHandler = smartHomeEntityStateRequestHandler.handler(integration.id, { entityId: input.entityId });
      return await innerHandler.getCachedOrUpdatedDataAsync(integration, {});
    }),
  subscribeEntityState: publicProcedure.input(z.object({ entityId: z.string() })).subscription(({ input }) => {
    return observable<{
      entityId: string;
      state: string;
    }>((emit) => {
      const channel = smartHomeEntityStateRequestHandler.createCacheChannel("homeAssistant", {
        entityId: input.entityId,
      });
      const unsubscribe = channel.subscribe((state) => {
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
      return await client.triggerToggleAsync(input.entityId);
    }),
  executeAutomation: publicProcedure
    .unstable_concat(createSmartHomeIntegrationMiddleware("interact"))
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = integrationCreator(integration);
      await client.triggerAutomationAsync(input.automationId);
    }),
});
