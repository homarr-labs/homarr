import { observable } from "@trpc/server/observable";

import type { Modify } from "@homarr/common/types";
import type { Integration } from "@homarr/db/schema";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { GluetunStatusInfo } from "@homarr/integrations/types";
import { gluetunVPNStatusHandler } from "@homarr/request-handler/gluetun";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const gluetunRouter = createTRPCRouter({
  getVpnInfo: publicProcedure.concat(createManyIntegrationMiddleware("query", "gluetun")).query(async ({ ctx }) => {
    const results = await Promise.all(
      ctx.integrations.map(async (integration) => {
        const innerHandler = gluetunVPNStatusHandler.handler(integration, {});
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
  subscribeVpnInfo: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "gluetun"))
    .subscription(({ ctx }) => {
      return observable<{
        integration: Modify<Integration, { kind: IntegrationKindByCategory<"gluetun"> }>;
        summary: GluetunStatusInfo;
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const innerHandler = gluetunVPNStatusHandler.handler(integrationWithSecrets, {});
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
