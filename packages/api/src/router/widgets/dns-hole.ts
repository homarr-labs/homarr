import { TRPCError } from "@trpc/server";

import { eq } from "@homarr/db";
import { integrations } from "@homarr/db/schema/sqlite";
import { PiHoleIntegration } from "@homarr/integrations";
import { z } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { decryptSecret } from "../integration";

export const dnsHoleRouter = createTRPCRouter({
  summary: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // TODO: add access control in some way, most likely reusable middleware or something
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.integrationId),
        with: {
          secrets: true,
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      const decryptedSecrets = integration.secrets.map((secret) => ({
        ...secret,
        value: decryptSecret(secret.value),
      }));
      const client = new PiHoleIntegration(integration.url, decryptedSecrets);

      const summary = await client.getSummaryAsync();

      return {
        ...summary,
        integrationId: input.integrationId,
      };
    }),
});
