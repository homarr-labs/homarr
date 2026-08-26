import { bazarrBadgesRequestHandler } from "@homarr/request-handler/bazarr";
import { mockWidgetData } from "@homarr/integrations";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const bazarrRouter = createTRPCRouter({
  getBadges: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get missing subtitle counts, provider issues, and health warnings for a Bazarr integration. REQUIRED: integrationId from integration_all",
      },
    })
    .concat(createOneIntegrationMiddleware("query", "bazarr", "mock"))
    .query(async ({ ctx }) => {
      if (ctx.integration.kind === "mock") return mockWidgetData.bazarr;

      const innerHandler = bazarrBadgesRequestHandler.handler({ ...ctx.integration, kind: "bazarr" }, {});
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
