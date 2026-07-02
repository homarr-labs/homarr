import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { mediaOrganizerRequestHandler } from "@homarr/request-handler/media-organizer";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const mediaOrganizerRouter = createTRPCRouter({
  getData: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get missing and queued movies/episodes from Radarr and Sonarr. REQUIRED: integrationIds (array of Radarr/Sonarr integration IDs from integration_all)",
      },
    })
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaOrganizer")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = mediaOrganizerRequestHandler.handler(integration, {});
          const { data } = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
          return {
            integrationId: integration.id,
            ...data,
          };
        }),
      );
      return results;
    }),
});
