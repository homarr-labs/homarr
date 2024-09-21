import { TRPCError } from "@trpc/server";

import { getIntegrationKindsByCategory } from "@homarr/definitions";
import { integrationCreator } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { logger } from "@homarr/log";
import { createCacheChannel } from "@homarr/redis";

import { controlsInputSchema } from "../../../../integrations/src/pi-hole/pi-hole-types";
import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", ...getIntegrationKindsByCategory("dnsHole")))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const cache = createCacheChannel<DnsHoleSummary>(`dns-hole-summary:${integration.id}`);
          const { data } = await cache.consumeAsync(async () => {
            const client = integrationCreator(integration);

            return await client.getSummaryAsync().catch((err) => {
              logger.error("dns-hole router - ", err);
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to fetch DNS Hole summary for ${integration.name} (${integration.id})`,
              });
            });
          });

          return {
            integrationId: integration.id,
            integrationKind: integration.kind,
            summary: data,
          };
        }),
      );
      return results;
    }),

  enable: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("dnsHole")))
    .mutation(async ({ ctx: { integration } }) => {
      const client = integrationCreator(integration);
      await client.enableAsync();
    }),

  disable: publicProcedure
    .input(controlsInputSchema)
    .unstable_concat(createOneIntegrationMiddleware("interact", ...getIntegrationKindsByCategory("dnsHole")))
    .mutation(async ({ ctx: { integration }, input }) => {
      const client = integrationCreator(integration);
      await client.disableAsync(input.duration);
    }),
});
