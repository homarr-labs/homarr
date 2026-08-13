import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { mediaReleaseRequestHandler } from "@homarr/request-handler/media-release";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { getMediaReleaseResponse } from "./media-release-result";

export const mediaReleaseRouter = createTRPCRouter({
  getMediaReleases: publicProcedure
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("mediaRelease")))
    .query(async ({ ctx }) => {
      return await getMediaReleaseResponse(ctx.integrations, async (integration) => {
        const innerHandler = mediaReleaseRequestHandler.handler(integration, {});
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          releases: data,
          updatedAt: timestamp,
        };
      });
    }),
});
