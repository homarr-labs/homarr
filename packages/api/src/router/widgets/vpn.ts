import { observable } from "@trpc/server/observable";

import type { Modify } from "@homarr/common/types";
import type { Integration } from "@homarr/db/schema";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { VpnSummary } from "@homarr/integrations/types";
import { vpnSummaryHandler } from "@homarr/request-handler/vpn";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createVpnIntegrationMiddleware = () =>
  createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("vpn"));

export const vpnRouter = createTRPCRouter({
  getSummaries: publicProcedure.unstable_concat(createVpnIntegrationMiddleware()).query(async ({ ctx }) => {
    return await Promise.all(
      ctx.integrations.map(async (integration) => {
        const innerHandler = vpnSummaryHandler.handler(integration, {});
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
  }),
  subscribeSummaries: publicProcedure.unstable_concat(createVpnIntegrationMiddleware()).subscription(({ ctx }) => {
    return observable<{
      integration: Modify<Integration, { kind: IntegrationKindByCategory<"vpn"> }>;
      summary: VpnSummary | null;
    }>((emit) => {
      const unsubscribes: (() => void)[] = [];
      for (const integrationWithSecrets of ctx.integrations) {
        const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
        const innerHandler = vpnSummaryHandler.handler(integrationWithSecrets, {});
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
