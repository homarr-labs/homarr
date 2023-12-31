import { TRPCError } from "@trpc/server";

import { and, createId, eq } from "@homarr/db";
import type {
  IntegrationKind,
  IntegrationSecretKind,
} from "@homarr/db/schema/items";
import { integrationSecretKindObject } from "@homarr/db/schema/items";
import { integrations, integrationSecrets } from "@homarr/db/schema/sqlite";
import { v } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const integrationRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    const integrations = await ctx.db.query.integrations.findMany();
    return integrations.map((integration) => ({
      id: integration.id,
      name: integration.name,
      kind: integration.kind,
      url: integration.url,
    }));
  }),
  byId: publicProcedure
    .input(v.integration.byId)
    .query(async ({ ctx, input }) => {
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
        with: {
          secrets: {
            columns: {
              kind: true,
              value: true,
              updatedAt: true,
            },
          },
        },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      return {
        id: integration.id,
        name: integration.name,
        kind: integration.kind,
        url: integration.url,
        secrets: integration.secrets.map((secret) => ({
          kind: secret.kind,
          // Only return the value if the secret is public, so for example the username
          value: integrationSecretKindObject[secret.kind].isPublic
            ? secret.value
            : null,
          updatedAt: secret.updatedAt,
        })),
      };
    }),
  create: publicProcedure
    .input(v.integration.create)
    .mutation(async ({ ctx, input }) => {
      const integrationId = createId();
      await ctx.db.insert(integrations).values({
        id: integrationId,
        name: input.name,
        url: input.url,
        kind: input.kind as IntegrationKind, // TODO: remove cast,
      });

      for (const secret of input.secrets) {
        await ctx.db.insert(integrationSecrets).values({
          kind: secret.kind as IntegrationSecretKind, // TODO: remove cast
          value: secret.value, // TODO: encrypt
          updatedAt: new Date(),
          integrationId,
        });
      }
    }),
  update: publicProcedure
    .input(v.integration.update)
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
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

      await ctx.db
        .update(integrations)
        .set({
          name: input.name,
          url: input.url,
        })
        .where(eq(integrations.id, input.id));

      const changedSecrets = input.secrets.filter(
        (secret): secret is { kind: IntegrationSecretKind; value: string } =>
          secret.value !== null && // only update secrets that have a value
          !integration.secrets.find(
            (s) => s.kind === secret.kind && s.value === secret.value,
          ),
      );

      if (changedSecrets.length > 0) {
        for (const changedSecret of changedSecrets) {
          await ctx.db
            .update(integrationSecrets)
            .set({
              value: changedSecret.value, // TODO: encrypt
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(integrationSecrets.integrationId, input.id),
                eq(integrationSecrets.kind, changedSecret.kind),
              ),
            );
        }
      }
    }),
  delete: publicProcedure
    .input(v.integration.delete)
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      await ctx.db.delete(integrations).where(eq(integrations.id, input.id));
    }),
});
