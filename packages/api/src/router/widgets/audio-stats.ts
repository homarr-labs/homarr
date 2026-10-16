import { audiobookshelfRequestHandler } from "@homarr/request-handler/audiobookshelf";
import { navidromeRequestHandler } from "@homarr/request-handler/navidrome";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";

export const audioStatsRouter = createApiRouter({
  getStats: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "audioStats"))
    .query(async ({ context }) => {
      const { kind } = context.integration;
      if (kind === "mock") return { kind: "navidrome" as const, data: mockWidgetData.audioStats };

      const fetchByKind = {
        navidrome: async () => {
          const handler = navidromeRequestHandler.handler({ ...context.integration, kind: "navidrome" as const }, {});
          return (await handler.getDataAsync()).data;
        },
        audiobookshelf: async () => {
          const handler = audiobookshelfRequestHandler.handler(
            { ...context.integration, kind: "audiobookshelf" as const },
            {},
          );
          return (await handler.getDataAsync()).data;
        },
      } as const;

      return { kind, data: await fetchByKind[kind]() };
    }),
});
