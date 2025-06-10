import { observable } from "@trpc/server/observable";

import type { FirewallSummary } from "@homarr/integrations";
import type { firewall } from "@homarr/integrations";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { systemInfoRequestHandler } from "@homarr/request-handler/health-monitoring";

export const firewallRouter = createTRPCRouter({
  getFirewallStatus: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "opnsense"))
    .query(async ({ ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = systemInfoRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            healthInfo: data,
            updatedAt: timestamp,
          };
        }),
      );
    }),
  subscribeFirewallStatus: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "opnsense"))
    .subscription(({ ctx }) => {
      return observable<{ integrationId: string; firewallSummary: FirewallSummary; timestamp: Date }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integration of ctx.integrations) {
          const innerHandler = systemInfoRequestHandler.handler(integration, {});
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