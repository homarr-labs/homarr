import { observable } from "@trpc/server/observable";

import type { Modify } from "@homarr/common/types";
import type { Integration } from "@homarr/db/schema";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
//import { integrationCreator } from "@homarr/integrations";
import type { NetworkControllerSummary } from "@homarr/integrations/types";
//import { controlsInputSchema } from "@homarr/integrations/types";
import { networkControllerRequestHandler } from "@homarr/request-handler/network-controller";

//import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
//import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const networkControllerRouter = createTRPCRouter({
  summary: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("networkController")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = networkControllerRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            summary: data,
          };
        }),
      );
      return results;
    }),

  subscribeToSummary: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("networkController")))
    .subscription(({ ctx }) => {
      return observable<{
        integration: Modify<Integration, { kind: IntegrationKindByCategory<"networkController"> }>;
        summary: NetworkControllerSummary;
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const innerHandler = networkControllerRequestHandler.handler(integrationWithSecrets, {});
          const unsubscribe = innerHandler.subscribe((summary) => {
            emit.next({
              integration,
              summary,
            });
          });
          unsubscribes.push(unsubscribe);
        }
        return () => {
          unsubscribes.forEach((unsubscribe) => {
            unsubscribe();
          });
        };
      });
    }),

  /* enable: protectedProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("networkController")))
    .mutation(async ({ ctx: { integration } }) => {
      const client = integrationCreator(integration);
      await client.enableAsync();

      const innerHandler = dnsHoleRequestHandler.handler(integration, {});
      // We need to wait for the integration to be enabled before invalidating the cache
      await new Promise<void>((resolve) => {
        setTimeout(() => void innerHandler.invalidateAsync().then(resolve), 1000);
      });
    }), */

  /* disable: protectedProcedure
    .input(controlsInputSchema)
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("networkController")))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = integrationCreator(integration);
      await client.disableAsync(input.duration);

      const innerHandler = dnsHoleRequestHandler.handler(integration, {});
      // We need to wait for the integration to be disabled before invalidating the cache
      await new Promise<void>((resolve) => {
        setTimeout(() => void innerHandler.invalidateAsync().then(resolve), 1000);
      });
    }), */
});
