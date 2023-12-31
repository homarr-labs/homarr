import { TRPCError } from "@trpc/server";

import { and, createId, eq } from "@homarr/db";
import type { IntegrationSecretSort } from "@homarr/db/schema/items";
import { integrationSecretSortObject } from "@homarr/db/schema/items";
import {
  integrations,
  integrationSecrets,
  services,
} from "@homarr/db/schema/sqlite";
import { v } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const integrationRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    const integrations = await ctx.db.query.integrations.findMany({
      with: {
        service: {
          with: {
            availabilityUrl: {
              columns: {
                url: true,
              },
            },
          },
        },
      },
    });
    return integrations.map((integration) => ({
      id: integration.id,
      name: integration.name,
      sort: integration.sort,
      service: {
        id: integration.service.id,
        name: integration.service.name,
        url: integration.service.availabilityUrl.url,
      },
    }));
  }),
  byId: publicProcedure
    .input(v.integration.byId)
    .query(async ({ ctx, input }) => {
      const integration = await ctx.db.query.integrations.findFirst({
        where: eq(integrations.id, input.id),
        with: {
          service: {
            with: {
              availabilityUrl: {
                columns: {
                  url: true,
                },
              },
            },
          },
          secrets: {
            columns: {
              sort: true,
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
        sort: integration.sort,
        service: {
          id: integration.service?.id ?? null,
          name: integration.service?.name ?? null,
          url: integration.service.availabilityUrl.url,
        },
        secrets: integration.secrets.map((secret) => ({
          sort: secret.sort,
          // Only return the value if the secret is public, so for example the username
          value: integrationSecretSortObject[secret.sort].isPublic
            ? secret.value
            : null,
          updatedAt: secret.updatedAt,
        })),
      };
    }),
  create: publicProcedure
    .input(v.integration.create)
    .mutation(async ({ ctx, input }) => {
      const service = await ctx.db.query.services.findFirst({
        where: eq(services.id, input.serviceId),
      });

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      const integrationId = createId();
      await ctx.db.insert(integrations).values({
        id: integrationId,
        name: input.name,
        sort: input.sort,
        serviceId: service.id,
      });

      for (const secret of input.secrets) {
        await ctx.db.insert(integrationSecrets).values({
          id: createId(),
          sort: secret.sort,
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
          serviceId: input.serviceId,
        })
        .where(eq(integrations.id, input.id));

      const changedSecrets = input.secrets.filter(
        (secret): secret is { sort: IntegrationSecretSort; value: string } =>
          secret.value !== null && // only update secrets that have a value
          !integration.secrets.find(
            (s) => s.sort === secret.sort && s.value === secret.value,
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
                eq(integrationSecrets.sort, changedSecret.sort),
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
