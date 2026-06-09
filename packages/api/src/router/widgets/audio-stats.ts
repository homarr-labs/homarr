import type { AudiobookshelfDashboardData, NavidromeDashboardData } from "@homarr/integrations/types";
import { audiobookshelfRequestHandler } from "@homarr/request-handler/audiobookshelf";
import { navidromeRequestHandler } from "@homarr/request-handler/navidrome";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const requestHandlerByKind = {
  navidrome: navidromeRequestHandler,
  audiobookshelf: audiobookshelfRequestHandler,
} as const;

export const audioStatsRouter = createTRPCRouter({
  getStats: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "navidrome", "audiobookshelf"))
    .query(async ({ ctx }) => {
      const fetchStatsByKind = {
        navidrome: async () => {
          const navidromeIntegration = { ...ctx.integration, kind: "navidrome" as const };
          const innerHandler = requestHandlerByKind.navidrome.handler(navidromeIntegration, {});
          const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
          return {
            kind: "navidrome" as const,
            data: data.data as NavidromeDashboardData,
          };
        },
        audiobookshelf: async () => {
          const audiobookshelfIntegration = { ...ctx.integration, kind: "audiobookshelf" as const };
          const innerHandler = requestHandlerByKind.audiobookshelf.handler(audiobookshelfIntegration, {});
          const data = await innerHandler.getCachedOrUpdatedDataAsync({ forceUpdate: false });
          return {
            kind: "audiobookshelf" as const,
            data: data.data as AudiobookshelfDashboardData,
          };
        },
      } as const;

      return fetchStatsByKind[ctx.integration.kind]();
    }),
});
