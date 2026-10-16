import { bazarrBadgesRequestHandler } from "@homarr/request-handler/bazarr";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";

export const bazarrRouter = createApiRouter({
  getBadges: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get missing subtitle counts, provider issues, and health warnings for a Bazarr integration. REQUIRED: integrationId from integration_all",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("query", "bazarr"))
    .query(async ({ context }) => {
      if (context.integration.kind === "mock") return mockWidgetData.bazarr;

      const innerHandler = bazarrBadgesRequestHandler.handler({ ...context.integration, kind: "bazarr" }, {});
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
