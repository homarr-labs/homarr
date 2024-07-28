import { TRPCError } from "@trpc/server";

import { PiHoleIntegration } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { logger } from "@homarr/log";
import { createCacheChannel } from "@homarr/redis";

import { controlsInputSchema } from "../../../../integrations/src/pi-hole/pi-hole-types";
import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure.unstable_concat(createOneIntegrationMiddleware("query", "piHole")).query(async ({ ctx }) => {
    const cache = createCacheChannel<DnsHoleSummary>(`dns-hole-summary:${ctx.integration.id}`);

    const { data } = await cache.consumeAsync(async () => {
      const client = new PiHoleIntegration(ctx.integration);

      return await client.getSummaryAsync().catch((err) => {
        logger.error("dns-hole router - ", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch DNS Hole summary for ${ctx.integration.name} (${ctx.integration.id})`,
        });
      });
    });

    return {
      ...data,
      integrationId: ctx.integration.id,
    };
  }),

  enable: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("interact", "piHole"))
    .mutation(async ({ ctx }) => {
      await new PiHoleIntegration(ctx.integration).enableAsync();
    }),

  disable: publicProcedure
    .input(controlsInputSchema)
    .unstable_concat(createOneIntegrationMiddleware("interact", "piHole"))
    .mutation(async ({ ctx, input }) => {
      await new PiHoleIntegration(ctx.integration).disableAsync(input.duration);
    }),
});
