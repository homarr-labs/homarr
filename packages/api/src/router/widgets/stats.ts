import { z } from "zod/v4";

import { integrationKinds, integrationDefs } from "@homarr/definitions";
import { getStatsMetrics } from "@homarr/integrations/stats";
import { getStatsSnapshotAsync, refreshStatsAsync } from "@homarr/request-handler/stats";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";

const access = createOneIntegrationMiddleware("query", ...integrationKinds);

export const statsRouter = createApiRouter({
  catalog: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List available statistics fields for an integration. Obtain integrationId from integration_all. Requires query access to that integration.",
      },
    })
    .concat(access)
    .query(({ context }) => ({
      name: context.integration.name,
      iconUrl: integrationDefs[context.integration.kind].iconUrl,
      metrics: getStatsMetrics(context.integration.kind),
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
    .query(async ({ context }) => await getStatsSnapshotAsync(context.integration)),
  // Display reads may populate the bounded statistics cache, without forcing
  // refreshes or exposing the mutation API to a board viewer.
  displaySnapshot: publicProcedure.concat(access).query(async ({ context }) => {
    await refreshStatsAsync(context.integration, false);
    return await getStatsSnapshotAsync(context.integration);
  }),
  refresh: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        effect: "additive",
        description:
          "Refresh read-only integration statistics through a bounded queue. Requires integrationId from integration_all and query access. force bypasses the one-hour freshness window.",
      },
    })
    .concat(access)
    .input(z.object({ force: z.boolean().default(false) }))
    .mutation(async ({ context, input }) => {
      await refreshStatsAsync(context.integration, input.force);
      return await getStatsSnapshotAsync(context.integration);
    }),
});
