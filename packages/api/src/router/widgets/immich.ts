import { z } from "zod/v4";

import {
  immichAlbumRequestHandler,
  immichAlbumsRequestHandler,
  immichStatsRequestHandler,
} from "@homarr/request-handler/immich";

import {
  createOneSharedWidgetIntegrationMiddleware,
  createOneWidgetIntegrationMiddleware,
} from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const immichRouter = createTRPCRouter({
  getServerStats: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "immich-serverStats"))
    .query(async ({ ctx }) => {
      const innerHandler = immichStatsRequestHandler.handler(ctx.integration, {});
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),

  getAlbum: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "immich-albumCarousel"))
    .input(
      z.object({
        albumId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const innerHandler = immichAlbumRequestHandler.handler(ctx.integration, { albumId: input.albumId });
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),

  getAlbums: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).optional(),
      }),
    )
    .concat(createOneSharedWidgetIntegrationMiddleware("query", "immich-albumCarousel", ["immich-serverStats"]))
    .query(async ({ ctx, input }) => {
      const innerHandler = immichAlbumsRequestHandler.handler(ctx.integration, { limit: input.limit });
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
