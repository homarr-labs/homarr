import type { IntegrationKind } from "@homarr/definitions";
import { mockWidgetData } from "@homarr/integrations";
import type { VpnSummary } from "@homarr/integrations/types";
import { vpnSummaryHandler } from "@homarr/request-handler/vpn";

import { createManyWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries, toPublicIntegrationError } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

interface VpnResult {
  integration: { id: string; name: string; kind: IntegrationKind; updatedAt: Date };
  summary: VpnSummary | null;
  error?: string;
}

export const vpnRouter = createTRPCRouter({
  getSummaries: publicProcedure
    .unstable_concat(createManyWidgetIntegrationMiddleware("query", "vpn"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(
        ctx.integrations,
        async (integration): Promise<VpnResult> => {
          if (integration.kind === "mock") {
            return {
              integration: {
                id: integration.id,
                name: integration.name,
                kind: integration.kind,
                updatedAt: new Date(mockWidgetData.timestamp),
              },
              summary: mockWidgetData.vpn,
              error: undefined,
            };
          }
          const { data, timestamp } = await vpnSummaryHandler
            .handler({ ...integration, kind: "gluetun" }, {})
            .getDataAsync();
          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            summary: data,
            error: undefined,
          };
        },
        {
          fallback: (integration, error): VpnResult => ({
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: new Date(0),
            },
            summary: null,
            error: toPublicIntegrationError(error),
          }),
          throwOnAllFailures: true,
        },
      );
    }),
});
