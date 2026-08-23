import { z } from "zod/v4";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations/factory";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { dnsHoleRequestHandler } from "@homarr/request-handler/dns-hole";

import {
  createManySharedWidgetIntegrationMiddleware,
  createOneWidgetIntegrationMiddleware,
} from "../../middlewares/integration";
import { PUBLIC_INTEGRATION_ERROR, settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

interface DnsHoleSummaryResult {
  integrationId: string;
  integrationName: string;
  integration: {
    id: string;
    name: string;
    kind: IntegrationKindByCategory<"dnsHole">;
    updatedAt?: Date;
  };
  summary: DnsHoleSummary | null;
  error?: string;
}

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get DNS blocking statistics from Pi-hole/AdGuard (queries, blocked, percentage). REQUIRED: integrationIds (array of Pi-hole/AdGuard integration IDs from integration_all)",
      },
    })
    .concat(createManySharedWidgetIntegrationMiddleware("query", "dnsHoleSummary", ["dnsHoleControls"]))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries<(typeof ctx.integrations)[number], DnsHoleSummaryResult>(
        ctx.integrations,
        async (integration) => {
          const { data, timestamp } = await dnsHoleRequestHandler.handler(integration, {}).getDataAsync();
          return {
            integrationId: integration.id,
            integrationName: integration.name,
            integration: { id: integration.id, name: integration.name, kind: integration.kind, updatedAt: timestamp },
            summary: data,
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

  enable: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Enable DNS blocking on Pi-hole/AdGuard. REQUIRED: integrationId (single Pi-hole/AdGuard integration ID from integration_all)",
      },
    })
    .concat(createOneWidgetIntegrationMiddleware("interact", "dnsHoleControls"))
    .mutation(async ({ ctx: { integration } }) => {
      const client = await createIntegrationAsync(integration);
      await client.enableAsync();
    }),

  disable: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Disable DNS blocking on Pi-hole/AdGuard. REQUIRED: integrationId (single integration ID). OPTIONAL: duration (number of seconds for temporary disable — omit for permanent disable)",
      },
    })
    .input(
      z.object({
        duration: z.number().optional(),
      }),
    )
    .concat(createOneWidgetIntegrationMiddleware("interact", "dnsHoleControls"))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = await createIntegrationAsync(integration);
      await client.disableAsync(input.duration);
    }),
});
