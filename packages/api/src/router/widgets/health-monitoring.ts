import { observable } from "@trpc/server/observable";

import type { Modify } from "@homarr/common/types";
import type { Integration } from "@homarr/db/schema/sqlite";
import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { HealthMonitoring } from "@homarr/integrations";
import { systemInfoRequestHandler } from "@homarr/request-handler/health-monitoring";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { z } from "zod";

export const healthMonitoringRouter = createTRPCRouter({
  getHealthStatus: publicProcedure
    .input(z.object({ pointCount: z.number().optional(), maxElements: z.number().optional() }))
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault", "dashDot", "proxmox"))
    .query(async ({ input: { pointCount = 1, maxElements = 32 }, ctx }) => {
      return await Promise.all(
        ctx.integrations.map(async (integrationWithSecrets) => {
          const innerHandler = systemInfoRequestHandler.handler(integrationWithSecrets, { maxElements, pointCount });
          const healthInfo = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });

          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;

          return {
            integration,
            healthInfo,
          };
        }),
      );
    }),

  subscribeHealthStatus: publicProcedure
    .input(z.object({ maxElements: z.number().optional() }))
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault", "dashDot", "proxmox"))
    .subscription(({ ctx, input: { maxElements = 32 } }) => {
      return observable<{
        integration: Modify<Integration, { kind: IntegrationKindByCategory<"healthMonitoring"> }>;
        healthInfo: { data: HealthMonitoring; timestamp: Date };
      }>((emit) => {
        const unsubscribes: (() => void)[] = [];
        for (const integrationWithSecrets of ctx.integrations) {
          const innerHandler = systemInfoRequestHandler.handler(integrationWithSecrets, { maxElements, pointCount: 1 });
          const { decryptedSecrets: _, ...integration } = integrationWithSecrets;
          const unsubscribe = innerHandler.subscribe((data) => {
            emit.next({
              integration,
              healthInfo: { data, timestamp: new Date() },
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
