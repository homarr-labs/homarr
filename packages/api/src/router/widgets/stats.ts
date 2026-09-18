import { z } from "zod/v4";

import { integrationKinds, integrationDefs } from "@homarr/definitions";
import { getStatsMetrics } from "@homarr/integrations/stats";
import { getStatsSnapshotAsync, refreshStatsAsync } from "@homarr/request-handler/stats";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const access = createOneIntegrationMiddleware("query", ...integrationKinds);

export const statsRouter = createTRPCRouter({
  catalog: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List available statistics fields for an integration. Obtain integrationId from integration_all. Requires query access to that integration.",
      },
    })
    .concat(access)
    .query(({ ctx }) => ({
      name: ctx.integration.name,
      iconUrl: integrationDefs[ctx.integration.kind].iconUrl,
      metrics: getStatsMetrics(ctx.integration.kind),
    })),
  snapshot: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read cached integration statistics and their age without contacting the service. Requires integrationId from integration_all and query access.",
      },
    })
    .concat(access)
    .query(async ({ ctx }) => await getStatsSnapshotAsync(ctx.integration)),
  refresh: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Refresh read-only integration statistics through a bounded queue. Requires integrationId from integration_all and query access. force bypasses the one-hour freshness window.",
      },
    })
    .concat(access)
    .input(z.object({ force: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      await refreshStatsAsync(ctx.integration, input.force);
      return await getStatsSnapshotAsync(ctx.integration);
    }),
});
