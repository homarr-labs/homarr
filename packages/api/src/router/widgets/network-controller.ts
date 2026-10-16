import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { NetworkControllerSummary } from "@homarr/integrations/types";
import { networkControllerRequestHandler } from "@homarr/request-handler/network-controller";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { PUBLIC_INTEGRATION_ERROR, settleIntegrationQueries } from "../../settle-integrations";
import { createApiRouter, publicProcedure } from "../../procedure";

interface NetworkControllerQueryResult {
  integrationId: string;
  integrationName: string;
  integration: {
    id: string;
    name: string;
    kind: IntegrationKindByCategory<"networkController">;
  };
  summary: NetworkControllerSummary | null;
  updatedAt?: Date;
  error?: string;
}

export const networkControllerRouter = createApiRouter({
  summary: publicProcedure
    .concat(createManyWidgetIntegrationMiddleware("query", "networkControllerSummary"))
    .query(async ({ context }) => {
      return await settleIntegrationQueries<(typeof context.integrations)[number], NetworkControllerQueryResult>(
        context.integrations,
        async (integration) => {
          const innerHandler = networkControllerRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integration: { id: integration.id, name: integration.name, kind: integration.kind },
            summary: data,
            updatedAt: timestamp,
          };
        },
        {
          fallback: (integration) => ({
            integrationId: integration.id,
            integrationName: integration.name,
            integration: { id: integration.id, name: integration.name, kind: integration.kind },
            summary: null,
            error: PUBLIC_INTEGRATION_ERROR,
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
