import { z } from "zod/v4";

import { mockWidgetData } from "@homarr/integrations";
import {
  immichAlbumRequestHandler,
  immichAlbumsRequestHandler,
  immichStatsRequestHandler,
} from "@homarr/request-handler/immich";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const immichRouter = createTRPCRouter({
  getServerStats: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "immich-serverStats"))
    .query(async ({ ctx }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.immichStats;
      const innerHandler = immichStatsRequestHandler.handler({ ...ctx.integration, kind: "immich" }, {});
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
      if (ctx.integration.kind === "mock") return mockWidgetData.immichAlbum;
      const innerHandler = immichAlbumRequestHandler.handler(
        { ...ctx.integration, kind: "immich" },
        {
          albumId: input.albumId,
        },
      );
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),

  getAlbums: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(500).optional(),
      }),
    )
    .concat(createOneWidgetIntegrationMiddleware("query", "immich-albumCarousel"))
    .query(async ({ ctx, input }) => {
      if (ctx.integration.kind === "mock") {
        if (input.limit === undefined) return [...mockWidgetData.immichAlbums];
        return mockWidgetData.immichAlbums.slice(0, input.limit);
      }
      const innerHandler = immichAlbumsRequestHandler.handler(
        { ...ctx.integration, kind: "immich" },
        {
          limit: input.limit,
        },
      );
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
