import { observable } from "@trpc/server/observable";

import type { Modify } from "@homarr/common/types";
import type { Integration } from "@homarr/db/schema/sqlite";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { controlsInputSchema } from "@homarr/integrations/types";
import { dnsHoleRequestHandler } from "@homarr/request-handler/dns-hole";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("dnsHole")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = dnsHoleRequestHandler.handler(integration, {});
          const summary = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
            },
            summary,
          };
        }),
      );
      return results;
    }),

  subscribeToSummary: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("dnsHole")))
    .subscription(({ ctx }) => {
      return observable<{
        integration: Modify<Integration, { kind: IntegrationKindByCategory<"dnsHole"> }>;
        summary: DnsHoleSummary;
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const innerHandler = dnsHoleRequestHandler.handler(integrationWithSecrets, {});
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

  enable: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("dnsHole")))
    .mutation(async ({ ctx: { integration } }) => {
      const client = integrationCreator(integration);
      await client.enableAsync();
    }),

  disable: publicProcedure
    .input(controlsInputSchema)
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("dnsHole")))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = integrationCreator(integration);
      await client.disableAsync(input.duration);
    }),
});
