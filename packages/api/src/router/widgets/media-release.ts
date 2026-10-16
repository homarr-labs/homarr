import { mediaReleaseRequestHandler } from "@homarr/request-handler/media-release";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";
import { getMediaReleaseResponse } from "./media-release-result";

export const mediaReleaseRouter = createApiRouter({
  getMediaReleases: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "mediaReleases"))
    .query(async ({ context }) => {
      return await getMediaReleaseResponse(context.integrations, async (integration) => {
        const innerHandler = mediaReleaseRequestHandler.handler(integration, {});
        const { data, timestamp } = await innerHandler.getDataAsync();

        return {
          releases: data,
          updatedAt: timestamp,
        };
      });
    }),
});
