import { paperlessNgxStatsRequestHandler } from "@homarr/request-handler/paperless-ngx";
import { mockWidgetData } from "@homarr/integrations";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";

export const paperlessNgxRouter = createApiRouter({
  getStats: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "paperlessNgx"))
    .query(async ({ context }) => {
      if (context.integration.kind === "mock") return mockWidgetData.paperlessNgx;
      const innerHandler = paperlessNgxStatsRequestHandler.handler(
        { ...context.integration, kind: "paperlessNgx" },
        {},
      );
      const data = await innerHandler.getDataAsync();
      return data.data;
    }),
});
