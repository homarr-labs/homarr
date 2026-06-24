import { z } from "zod/v4";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import { dnsHoleRequestHandler } from "@homarr/request-handler/dns-hole";

import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get DNS blocking statistics from Pi-hole/AdGuard (queries, blocked, percentage). REQUIRED: integrationIds (array of Pi-hole/AdGuard integration IDs from integration_all)",
      },
    })
    .concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("dnsHole")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const innerHandler = dnsHoleRequestHandler.handler(integration, {});
          const { data, timestamp } = await innerHandler.getDataAsync();

          return {
            integration: {
              id: integration.id,
              name: integration.name,
              kind: integration.kind,
              updatedAt: timestamp,
            },
            summary: data,
          };
        }),
      );
      return results;
    }),

  enable: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Enable DNS blocking on Pi-hole/AdGuard. REQUIRED: integrationId (single Pi-hole/AdGuard integration ID from integration_all)",
      },
    })
    .concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("dnsHole")))
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
    .concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("dnsHole")))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = await createIntegrationAsync(integration);
      await client.disableAsync(input.duration);
    }),
});
