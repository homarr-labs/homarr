import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import {
  immichAlbumRequestHandler,
  immichAlbumsRequestHandler,
  immichStatsRequestHandler,
} from "@homarr/request-handler/immich";

import type { IntegrationAction } from "../../middlewares/integration";
import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createImmichIntegrationMiddleware = (action: IntegrationAction) =>
  createOneIntegrationMiddleware(action, ...getIntegrationKindsByCategory("photoService"));

export const immichRouter = createTRPCRouter({
  getServerStats: publicProcedure.concat(createImmichIntegrationMiddleware("query")).query(async ({ ctx }) => {
    const innerHandler = immichStatsRequestHandler.handler(ctx.integration, {});
    const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data.data;
  }),

  getAlbum: publicProcedure
    .concat(createImmichIntegrationMiddleware("query"))
    .input(
      z.object({
        albumId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const innerHandler = immichAlbumRequestHandler.handler(ctx.integration, { albumId: input.albumId });
      const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
      return data.data;
    }),

  getAlbums: publicProcedure.concat(createImmichIntegrationMiddleware("query")).query(async ({ ctx }) => {
    const innerHandler = immichAlbumsRequestHandler.handler(ctx.integration, {});
    const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
    return data.data;
  }),
});
