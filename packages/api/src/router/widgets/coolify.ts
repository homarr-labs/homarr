import type { CoolifyInstanceInfo } from "@homarr/integrations/types";
import { mockWidgetData } from "@homarr/integrations";
import { coolifyRequestHandler } from "@homarr/request-handler/coolify";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createApiRouter, publicProcedure } from "../../procedure";

interface CoolifyInstanceResult {
  integrationId: string;
  integrationName: string;
  integrationUrl: string;
  instanceInfo: CoolifyInstanceInfo | null;
  updatedAt: Date;
  error?: string;
}

export const coolifyRouter = createApiRouter({
  getInstancesInfo: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "coolify"))
    .query(async ({ context }) => {
      return await settleIntegrationQueries(
        context.integrations,
        async (integration): Promise<CoolifyInstanceResult> => {
          if (integration.kind === "mock") {
            return {
              integrationId: integration.id,
              integrationName: integration.name,
              integrationUrl: integration.url,
              instanceInfo: mockWidgetData.coolify,
              updatedAt: new Date(mockWidgetData.timestamp),
            };
          }

          const innerHandler = coolifyRequestHandler.handler({ ...integration, kind: "coolify" }, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            instanceInfo: data,
            updatedAt: timestamp,
          };
        },
        {
          fallback: (integration, error): CoolifyInstanceResult => ({
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            instanceInfo: null,
            updatedAt: new Date(0),
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
