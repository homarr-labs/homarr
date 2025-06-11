import { observable } from "@trpc/server/observable";

import type { FirewallSummary } from "@homarr/integrations";
import type { Integration } from "@homarr/db/schema";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { firewallRequestHandler } from "@homarr/request-handler/firewall";
import { getIntegrationKindsByCategory } from "@homarr/definitions";

import type { Modify } from "@homarr/common/types";

export const firewallRouter = createTRPCRouter({
  getFirewallStatus: publicProcedure    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = firewallRequestHandler.handler(integration, {});
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
  subscribeFirewallStatus: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("firewall")))
    .subscription(({ ctx }) => {
      return observable<{
        integration: Modify<Integration, { kind: IntegrationKindByCategory<"firewall"> }>;
        summary: FirewallSummary;
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const innerHandler = firewallRequestHandler.handler(integrationWithSecrets, {});
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
});