import { TRPCError } from "@trpc/server";

import { PiHoleIntegration } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { logger } from "@homarr/log";
import { createCacheChannel } from "@homarr/redis";

import { controlsInputSchema } from "../../../../integrations/src/pi-hole/pi-hole-types";
import { createManyIntegrationMiddleware, createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .unstable_concat(createManyIntegrationMiddleware("query", "piHole", "adGuardHome"))
    .query(async ({ ctx }) => {
      const results = await Promise.all(
        ctx.integrations.map(async (integration) => {
          const cache = createCacheChannel<DnsHoleSummary>(`dns-hole-summary:${integration.id}`);
          const { data } = await cache.consumeAsync(async () => {
            let client;
            switch (integration.kind) {
              case "piHole":
                client = new PiHoleIntegration(integration);
                break;
              // case 'adGuardHome':
              //   client = new AdGuardHomeIntegration(integration);
              //   break;
              default:
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Unsupported integration type: ${integration.kind}`,
                });
            }

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
            summary: data,
          };
        }),
      );
      return results;
    }),

  enable: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", "piHole", "adGuardHome"))
    .mutation(async ({ ctx }) => {
      let client;
      switch (ctx.integration.kind) {
        case "piHole":
          client = new PiHoleIntegration(ctx.integration);
          break;
        // case 'adGuardHome':
        //   client = new AdGuardHomeIntegration(ctx.integration);
        //   break;
        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Unsupported integration type: ${ctx.integration.kind}`,
          });
      }
      await client.enableAsync();
    }),

  disable: publicProcedure
    .input(controlsInputSchema)
    .unstable_concat(createOneIntegrationMiddleware("interact", "piHole", "adGuardHome"))
    .mutation(async ({ ctx, input }) => {
      let client;
      switch (ctx.integration.kind) {
        case "piHole":
          client = new PiHoleIntegration(ctx.integration);
          break;
        // case 'adGuardHome':
        //   client = new AdGuardHomeIntegration(ctx.integration);
        //   break;
        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Unsupported integration type: ${ctx.integration.kind}`,
          });
      }
      await client.disableAsync(input.duration);
    }),
});
