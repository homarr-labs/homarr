import { audiobookshelfRequestHandler } from "@homarr/request-handler/audiobookshelf";
import { navidromeRequestHandler } from "@homarr/request-handler/navidrome";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const audioStatsRouter = createTRPCRouter({
  getStats: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "audioStats"))
    .query(async ({ ctx }) => {
      const { kind } = ctx.integration;
      if (kind === "mock") return { kind: "navidrome" as const, data: mockWidgetData.audioStats };

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
