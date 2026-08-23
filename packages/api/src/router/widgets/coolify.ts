import type { CoolifyInstanceInfo } from "@homarr/integrations/types";
import { coolifyRequestHandler } from "@homarr/request-handler/coolify";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

interface CoolifyInstanceResult {
  integrationId: string;
  integrationName: string;
  integrationUrl: string;
  instanceInfo: CoolifyInstanceInfo | null;
  updatedAt: Date;
  error?: string;
}

export const coolifyRouter = createTRPCRouter({
  getInstancesInfo: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "coolify"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration): Promise<CoolifyInstanceResult> => {
          const innerHandler = coolifyRequestHandler.handler(integration, {});
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
