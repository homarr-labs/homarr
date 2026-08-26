import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { mockWidgetData } from "@homarr/integrations";
import {
  immichAlbumRequestHandler,
  immichAlbumsRequestHandler,
  immichStatsRequestHandler,
} from "@homarr/request-handler/immich";

import type { IntegrationAction } from "../../middlewares/integration";
import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createImmichIntegrationMiddleware = (action: IntegrationAction) =>
  createOneIntegrationMiddleware(action, ...getIntegrationKindsByCategory("photoService"), "mock");

export const immichRouter = createTRPCRouter({
  getServerStats: publicProcedure.concat(createImmichIntegrationMiddleware("query")).query(async ({ ctx }) => {
    if (ctx.integration.kind === "mock") return mockWidgetData.immichStats;
    const innerHandler = immichStatsRequestHandler.handler({ ...ctx.integration, kind: "immich" }, {});
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
    .concat(createImmichIntegrationMiddleware("query"))
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
