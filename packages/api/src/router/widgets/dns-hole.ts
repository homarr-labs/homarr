import { observable } from "@trpc/server/observable";

import type { Modify } from "@homarr/common/types";
import type { Integration } from "@homarr/db/schema/sqlite";
import type { IntegrationKindByCategory, WidgetKind } from "@homarr/definitions";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { controlsInputSchema } from "@homarr/integrations/types";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .input(z.object({ widgetKind: z.enum(["dnsHoleSummary", "dnsHoleControls"]) }))
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("dnsHole")))
    .query(async ({ input: { widgetKind }, ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async ({ decryptedSecrets: _, ...integration }) => {
          const channel = createItemAndIntegrationChannel<DnsHoleSummary>(widgetKind, integration.id);
          const { data: summary, timestamp } = (await channel.getAsync()) ?? { data: null, timestamp: new Date(0) };

          return {
            integration,
            timestamp,
            summary,
          };
        }),
      );
      return results;
    }),

  subscribeToSummary: publicProcedure
    .input(z.object({ widgetKind: z.enum(["dnsHoleSummary", "dnsHoleControls"]) }))
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("dnsHole")))
    .subscription(({ input: { widgetKind }, ctx }) => {
      return observable<{
        integration: Modify<Integration, { kind: IntegrationKindByCategory<"dnsHole"> }>;
        timestamp: Date;
        summary: DnsHoleSummary;
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const channel = createItemAndIntegrationChannel<DnsHoleSummary>(widgetKind as WidgetKind, integration.id);
          const unsubscribe = channel.subscribe((summary) => {
            emit.next({
              integration,
              timestamp: new Date(),
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
