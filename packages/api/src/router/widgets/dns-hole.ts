import { observable } from "@trpc/server/observable";

import type { WidgetKind } from "@homarr/definitions";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { controlsInputSchema } from "@homarr/integrations/types";
import { createItemAndIntegrationChannel } from "@homarr/redis";
import { z } from "@homarr/validation";

import { dnsHoleHandler } from "../../../../cron-jobs/src/jobs/integrations/dns-hole";
import { createIntegrationWidgetHandlerRouter } from "../../../../cron-jobs/src/lib/handler";
import {
  createManyIntegrationMiddleware,
  createManyIntegrationMiddleware2,
  createOneIntegrationMiddleware,
} from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .input(z.object({ widgetKind: z.enum(["dnsHoleSummary", "dnsHoleControls"]) }))
    .unstable_concat(createManyIntegrationMiddleware2("query", ...getIntegrationKindsByCategory("dnsHole")))
    .query(async ({ ctx }) => {
      const handler = createIntegrationWidgetHandlerRouter(dnsHoleHandler, {
        widgetKinds: ["dnsHoleSummary", "dnsHoleControls"],
      });

      const results = await handler(ctx.integrations, {});

      const integrationMap = new Map(
        ctx.integrations.map(({ secrets: _unsave, ...saveIntegrationFields }) => [
          saveIntegrationFields.id,
          saveIntegrationFields,
        ]),
      );

      return results.map((result) => ({
        // Integration is always defined as it's the same array for map and handler
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        integration: integrationMap.get(result.integrationId)!,
        summary: result.data,
      }));
    }),

  subscribeToSummary: publicProcedure
    .input(z.object({ widgetKind: z.enum(["dnsHoleSummary", "dnsHoleControls"]) }))
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("dnsHole")))
    .subscription(({ input: { widgetKind }, ctx }) => {
      return observable<{
        integrationId: string;
        summary: DnsHoleSummary;
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const channel = createItemAndIntegrationChannel<DnsHoleSummary>(widgetKind as WidgetKind, integration.id);
          const unsubscribe = channel.subscribe((summary) => {
            emit.next({
              integrationId: integration.id,
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
