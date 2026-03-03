import { observable } from "@trpc/server/observable";
import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { ImmichAlbum, ImmichServerStats } from "@homarr/integrations";
import { ImmichIntegration } from "@homarr/integrations";

import type { IntegrationAction } from "../../middlewares/integration";
import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const createImmichIntegrationMiddleware = (action: IntegrationAction) =>
  createManyIntegrationMiddleware(action, ...getIntegrationKindsByCategory("mediaService"));

export const immichRouter = createTRPCRouter({
  getServerStats: publicProcedure
    .concat(createImmichIntegrationMiddleware("query"))
    .query(async ({ ctx }) => {
      const immichIntegration = ctx.integrations[0];
      if (!immichIntegration || !(immichIntegration instanceof ImmichIntegration)) {
        throw new Error("Immich integration not found");
      }

      const stats = await immichIntegration.getServerStatsAsync();
      return {
        userCount: stats.userCount,
        photoCount: stats.photoCount,
        videoCount: stats.videoCount,
        totalLibraryUsageInBytes: stats.totalLibraryUsageInBytes,
      } as ImmichServerStats;
    }),

  getAlbum: publicProcedure
    .concat(createImmichIntegrationMiddleware("query"))
    .input(
      z.object({
        albumId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const immichIntegration = ctx.integrations[0];
      if (!immichIntegration || !(immichIntegration instanceof ImmichIntegration)) {
        throw new Error("Immich integration not found");
      }

      const album = await immichIntegration.getAlbumAsync(input.albumId);
      return album as ImmichAlbum;
    }),

  getAlbums: publicProcedure
    .concat(createImmichIntegrationMiddleware("query"))
    .query(async ({ ctx }) => {
      const immichIntegration = ctx.integrations[0];
      if (!immichIntegration || !(immichIntegration instanceof ImmichIntegration)) {
        throw new Error("Immich integration not found");
      }

      return await immichIntegration.getAlbumsAsync();
    }),
});
