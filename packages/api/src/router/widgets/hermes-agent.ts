import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { hermesAgentRequestHandler } from "@homarr/request-handler/hermes-agent";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import type { HermesAgentWidgetOverview } from "./hermes-agent-transform";
import { toHermesAgentWidgetOverview } from "./hermes-agent-transform";

interface HermesAgentRouterResult {
  integrationId: string;
  integrationName: string;
  integrationUrl: string | null;
  overview: HermesAgentWidgetOverview | null;
  updatedAt: Date | null;
  error: "unavailable" | null;
}

export const hermesAgentRouter = createTRPCRouter({
  getOverviews: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get Hermes Agent gateway health, update status, activity counts, and privacy-safe widget details. REQUIRED: integrationIds (array of Hermes Agent integration IDs from integration_all). A result with detailsRestricted=true means the caller lacks use access to detailed integration data; it is not an endpoint failure.",
      },
    })
    .concat(createManyIntegrationMiddleware("query", "hermesAgent"))
    .query(async ({ ctx }) => {
      const integrationsWithPermissions =
        ctx.session && ctx.integrations.length > 0 ? await getIntegrationsWithPermissionsAsync(ctx.session) : [];
      const integrationIdsWithDetailAccess = new Set(
        integrationsWithPermissions
          .filter((integration) => integration.permissions.hasUseAccess)
          .map((integration) => integration.id),
      );

      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration): Promise<HermesAgentRouterResult> => {
          const innerHandler = hermesAgentRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.externalUrl ?? null,
            overview: toHermesAgentWidgetOverview(data, integrationIdsWithDetailAccess.has(integration.id)),
            updatedAt: timestamp,
            error: null,
          };
        },
        {
          fallback: (integration) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            integrationUrl: integration.externalUrl ?? null,
            overview: null,
            updatedAt: null,
            error: "unavailable" as const,
          }),
        },
      );
    }),
});
