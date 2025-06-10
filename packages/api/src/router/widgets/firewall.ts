import { observable } from "@trpc/server/observable";

import type { FirewallSummary } from "@homarr/integrations";
import type { Integration } from "@homarr/db/schema";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { firewallRequestHandler } from "@homarr/request-handler/firewall";
import { getIntegrationKindsByCategory } from "@homarr/definitions";

export const firewallRouter = createTRPCRouter({
  getFirewallStatus: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall")))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = firewallRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            firewallSummary: data,
            updatedAt: timestamp,
          };
        }),
      );
    }),
  subscribeFirewallStatus: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall")))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; firewallSummary: FirewallSummary; timestamp: Date }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integration of ctx.integrations) {
          const innerHandler = firewallRequestHandler.handler(integration, {});
          const unsubscribe = innerHandler.subscribe((firewallSummary) => {
            emit.next({
              integrationId: integration.id,
              firewallSummary,
              timestamp: new Date(),
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
});