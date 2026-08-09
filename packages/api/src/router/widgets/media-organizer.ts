import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { mediaOrganizerRequestHandler } from "@homarr/request-handler/media-organizer";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const mediaOrganizerRouter = createTRPCRouter({
  getData: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get missing and queued movies/episodes from Radarr and Sonarr. Requires query (use) access to each integration. REQUIRED: integrationIds (array of Radarr/Sonarr integration IDs from integration_all). OPTIONAL: pageSize (1-50, default 10)",
      },
    })
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaOrganizer")))
    .input(z.object({ pageSize: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration) => {
          const innerHandler = mediaOrganizerRequestHandler.handler(integration, { pageSize: input.pageSize });
          const { data } = await innerHandler.getDataAsync();
          return {
            integrationId: integration.id,
            integrationName: integration.name,
            ...data,
            error: undefined as string | undefined,
          };
        },
        {
          fallback: (integration, error) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            missing: [],
            missingCount: 0,
            queued: [],
            queuedCount: 0,
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
