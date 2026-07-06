import { audiobookshelfRequestHandler } from "@homarr/request-handler/audiobookshelf";
import { navidromeRequestHandler } from "@homarr/request-handler/navidrome";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const audioStatsRouter = createTRPCRouter({
  getStats: publicProcedure
    .concat(createOneIntegrationMiddleware("query", "navidrome", "audiobookshelf"))
    .query(async ({ ctx }) => {
      const { kind } = ctx.integration;

      const fetchByKind = {
        navidrome: async () => {
          const handler = navidromeRequestHandler.handler({ ...ctx.integration, kind: "navidrome" as const }, {});
          return (await handler.getDataAsync()).data;
        },
        audiobookshelf: async () => {
          const handler = audiobookshelfRequestHandler.handler(
            { ...ctx.integration, kind: "audiobookshelf" as const },
            {},
          );
          return (await handler.getDataAsync()).data;
        },
      } as const;

      return { kind, data: await fetchByKind[kind]() };
    }),
});
