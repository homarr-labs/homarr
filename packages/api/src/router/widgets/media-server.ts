import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { mediaServerRequestHandler } from "@homarr/request-handler/media-server";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createMediaServerIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, ...getIntegrationKindsByCategory("mediaService"));

export const mediaServerRouter = createTRPCRouter({
  getCurrentStreams: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get currently active streams from Plex/Jellyfin/Emby media servers. REQUIRED: integrationIds (array of media server integration IDs from integration_all), showOnlyPlaying (boolean — true to filter to actively playing streams only)",
      },
    })
    .concat(createMediaServerIntegrationMiddleware("query"))
    .input(z.object({ showOnlyPlaying: z.boolean() }))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const { data } = await mediaServerRequestHandler
          .handler(integration, { showOnlyPlaying: input.showOnlyPlaying })
          .getDataAsync();
        return { integrationId: integration.id, integrationKind: integration.kind, sessions: data };
      });
    }),
});
