import { observable } from "@trpc/server/observable";

import type { UptimeKumaCheck } from "@homarr/integrations/types";
import { uptimeKumaChecksRequestHandler } from "@homarr/request-handler/uptime-kuma";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const uptimeKumaRouter = createTRPCRouter({
  checks: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "uptimeKuma", "mock"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = uptimeKumaChecksRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
            },
            checks: data,
            updatedAt: timestamp,
          };
        }),
      );
      return results;
    }),

  subscribeToChecks: publicProcedure
    .concat(createManyIntegrationMiddleware("query", "uptimeKuma", "mock"))
    .subscription(({ ctx }) => {
      return observable<{
        integration: { id: string; name: string; kind: string };
        checks: UptimeKumaCheck[];
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const innerHandler = uptimeKumaChecksRequestHandler.handler(integrationWithSecrets, {} as any);
          const unsubscribe = innerHandler.subscribe((checks) => {
            emit.next({
              integration,
              checks,
            });
          });
          unsubscribes.push(unsubscribe);
        }
        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
      });
    }),
});
