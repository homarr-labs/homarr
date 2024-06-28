import { TRPCError } from "@trpc/server";

import { decryptSecret } from "@homarr/common";
import { and, eq, inArray } from "@homarr/db";
import { integrations } from "@homarr/db/schema/sqlite";
import type { IntegrationKind } from "@homarr/definitions";
import { z } from "@homarr/validation";

import { publicProcedure } from "../trpc";

export const createOneIntegrationMiddleware = <TKind extends IntegrationKind>(...kinds: TKind[]) => {
  return publicProcedure.input(z.object({ integrationId: z.string() })).use(async ({ input, ctx, next }) => {
    const integration = await ctx.db.query.integrations.findFirst({
      where: and(eq(integrations.id, input.integrationId), inArray(integrations.kind, kinds)),
      with: {
        secrets: true,
      },
    });

    if (!integration) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Integration with id ${input.integrationId} not found or not of kinds ${kinds.join(",")}`,
      });
    }

    const { secrets, kind, ...rest } = integration;

    return next({
      ctx: {
        integration: {
          ...rest,
          kind: kind as TKind,
          decryptedSecrets: secrets.map((secret) => ({
            ...secret,
            value: decryptSecret(secret.value),
          })),
        },
      },
    });
  });
};

export const createManyIntegrationMiddleware = <TKind extends IntegrationKind>(...kinds: TKind[]) => {
  return publicProcedure
    .input(z.object({ integrationIds: z.array(z.string()).min(1) }))
    .use(async ({ ctx, input, next }) => {
      const dbIntegrations = await ctx.db.query.integrations.findMany({
        where: and(inArray(integrations.id, input.integrationIds), inArray(integrations.kind, kinds)),
        with: {
          secrets: true,
          items: true,
        },
      });

      const offset = input.integrationIds.length - dbIntegrations.length;
      if (offset !== 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${offset} of the specified integrations not found or not of kinds ${kinds.join(",")}`,
        });
      }

      return next({
        ctx: {
          integrations: dbIntegrations.map(({ secrets, kind, ...rest }) => ({
            ...rest,
            kind: kind as TKind,
            decryptedSecrets: secrets.map((secret) => ({
              ...secret,
              value: decryptSecret(secret.value),
            })),
          })),
        },
      });
    });
};

export const createManyIntegrationOfOneItemMiddleware = <TKind extends IntegrationKind>(...kinds: TKind[]) => {
  return publicProcedure
    .input(z.object({ integrationIds: z.array(z.string()).min(1), itemId: z.string() }))
    .use(async ({ ctx, input, next }) => {
      const dbIntegrations = await ctx.db.query.integrations.findMany({
        where: and(inArray(integrations.id, input.integrationIds), inArray(integrations.kind, kinds)),
        with: {
          secrets: true,
          items: true,
        },
      });

      const offset = input.integrationIds.length - dbIntegrations.length;
      if (offset !== 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${offset} of the specified integrations not found or not of kinds ${kinds.join(",")}`,
        });
      }

      const dbIntegrationWithItem = dbIntegrations.filter((integration) =>
        integration.items.some((item) => item.itemId === input.itemId),
      );

      if (dbIntegrationWithItem.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration for item was not found",
        });
      }

      return next({
        ctx: {
          integrations: dbIntegrationWithItem.map(({ secrets, kind, ...rest }) => ({
            ...rest,
            kind: kind as TKind,
            decryptedSecrets: secrets.map((secret) => ({
              ...secret,
              value: decryptSecret(secret.value),
            })),
          })),
        },
      });
    });
};
