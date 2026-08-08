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
    const data = await innerHandler.getDataAsync();
    return data.data;
  }),

  getAlbum: publicProcedure
    .concat(createImmichIntegrationMiddleware("query"))
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
    .concat(createImmichIntegrationMiddleware("query"))
    .query(async ({ ctx, input }) => {
      const innerHandler = immichAlbumsRequestHandler.handler(ctx.integration, { limit: input.limit });
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
