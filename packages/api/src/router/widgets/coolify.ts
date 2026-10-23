import { getSafeApplicationUrl, removeTrailingSlash } from "@homarr/common";
import type { CoolifyInstanceInfo } from "@homarr/integrations/types";
import { mockWidgetData } from "@homarr/integrations";
import { coolifyRequestHandler } from "@homarr/request-handler/coolify";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

interface CoolifyInstanceResult {
  integrationId: string;
  integrationName: string;
  integrationUrl: string;
  externalUrl: string | null;
  instanceInfo: CoolifyInstanceInfo | null;
  updatedAt: Date;
  error?: string;
}

interface CoolifyIntegrationContext {
  externalUrl: string | null;
}

/**
 * Base URL for deep links into the Coolify dashboard: the URL of the linked app, otherwise the integration URL.
 * The integration URL is only used for API requests and can be an internal address.
 */
export const getExternalUrl = (integration: CoolifyIntegrationContext): string | null => {
  const safeUrl = getSafeApplicationUrl(integration.externalUrl);
  return safeUrl ? removeTrailingSlash(safeUrl) : null;
};

export const coolifyRouter = createTRPCRouter({
  getInstancesInfo: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "coolify"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration): Promise<CoolifyInstanceResult> => {
          const externalUrl = getExternalUrl(integration);

          if (integration.kind === "mock") {
            return {
              integrationId: integration.id,
              integrationName: integration.name,
              integrationUrl: integration.url,
              externalUrl,
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
            externalUrl,
            instanceInfo: data,
            updatedAt: timestamp,
          };
        },
        {
          fallback: (integration, error): CoolifyInstanceResult => ({
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.url,
            externalUrl: getExternalUrl(integration),
            instanceInfo: null,
            updatedAt: new Date(0),
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
