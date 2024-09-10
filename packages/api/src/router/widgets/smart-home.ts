import { observable } from "@trpc/server/observable";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import { homeAssistantEntityState } from "@homarr/redis";
import { z } from "@homarr/validation";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const smartHomeRouter = createTRPCRouter({
  subscribeEntityState: publicProcedure.input(z.object({ entityId: z.string() })).subscription(({ input }) => {
    return observable<{
      entityId: string;
      state: string;
    }>((emit) => {
      const unsubscribe = homeAssistantEntityState.subscribe((message) => {
        if (message.entityId !== input.entityId) {
          return;
        }
        emit.next(message);
      });

      return () => {
        unsubscribe();
      };
    });
  }),
  switchEntity: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("smartHomeServer")))
    .input(z.object({ entityId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = integrationCreator(integration);
      return await client.triggerToggleAsync(input.entityId);
    }),
  executeAutomation: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("smartHomeServer")))
    .input(z.object({ automationId: z.string() }))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = integrationCreator(integration);
      await client.triggerAutomationAsync(input.automationId);
    }),
});
