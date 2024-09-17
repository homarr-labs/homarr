import { TRPCError } from "@trpc/server";

import { integrationCreatorByKind } from "@homarr/integrations";
import { logger } from "@homarr/log";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const healthMonitoringRouter = createTRPCRouter({
  getHealthStatus: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "openmediavault"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const client = integrationCreatorByKind(integration.kind, integration);

          try {
            const healthInfo = await client.getSystemInfoAsync();
            return {
              integrationId: integration.id,
              healthInfo,
            };
          } catch (err) {
            logger.error(`Error fetching health info for ${integration.name} (${integration.id}) - `, err);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to fetch health info for ${integration.name} (${integration.id})`,
            });
          }
        }),
      );
      return results;
    }),
});
