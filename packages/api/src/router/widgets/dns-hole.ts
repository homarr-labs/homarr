import { TRPCError } from "@trpc/server";

import { PiHoleIntegration } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import { logger } from "@homarr/log";
import { createCacheChannel } from "@homarr/redis";

import { createOneIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .unstable_concat(createOneIntegrationMiddleware("piHole"))
    .query(async ({ ctx }) => {
      const cache = createCacheChannel<DnsHoleSummary>(
        `dns-hole-summary:${ctx.integration.id}`,
      );

      const { data } = await cache.consumeAsync(async () => {
        const client = new PiHoleIntegration(
          ctx.integration.url,
          ctx.integration.decryptedSecrets,
        );

        return await client.getSummaryAsync().catch((err) => {
          logger.error(err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch DNS Hole summary",
          });
        });
      });

      return {
        ...data,
        integrationId: ctx.integration.id,
      };
    }),
});
