import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { mediaReleaseRequestHandler } from "@homarr/request-handler/media-release";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const mediaReleaseRouter = createTRPCRouter({
  getMediaReleases: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaRelease")))
    .query(async ({ ctx }) => {
      const results = await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = mediaReleaseRequestHandler.handler(integration, {});
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          integration: {
            id: integration.id,
            name: integration.name,
            kind: integration.kind,
            updatedAt: timestamp,
          },
          releases: data,
        };
      });
      return results.flatMap((result) =>
        result.releases.map((release) => ({
          ...release,
          integration: result.integration,
        })),
      );
    }),
});
