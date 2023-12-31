import { TRPCError } from "@trpc/server";

import { createId, eq } from "@homarr/db";
import { availabilityUrls, services } from "@homarr/db/schema/sqlite";
import { v } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const serviceRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    const services = await ctx.db.query.services.findMany({
      with: {
        availabilityUrl: {
          columns: {
            url: true,
          },
        },
        integrations: {
          columns: {
            id: true,
          },
        },
      },
    });
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      url: service.availabilityUrl?.url ?? null,
      hasRelations: service.integrations.length >= 1,
    }));
  }),
  create: publicProcedure
    .input(v.service.create)
    .mutation(async ({ ctx, input }) => {
      const existingUrl = await ctx.db.query.availabilityUrls.findFirst({
        where: eq(availabilityUrls.url, input.url.toLowerCase()),
        with: {
          services: {
            columns: {
              id: true,
            },
          },
        },
      });

      if ((existingUrl?.services.length ?? 0) >= 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A service with this URL already exists",
        });
      }

      const urlId = existingUrl?.id ?? createId();
      if (!existingUrl) {
        await ctx.db.insert(availabilityUrls).values({
          id: urlId,
          url: input.url,
          isStatusCheckEnabled: true,
        });
      }

      const serviceId = createId();
      await ctx.db.insert(services).values({
        id: serviceId,
        name: input.name,
        availabilityUrlId: urlId,
      });

      return serviceId;
    }),
  delete: publicProcedure
    .input(v.service.delete)
    .mutation(async ({ ctx, input }) => {
      const service = await ctx.db.query.services.findFirst({
        where: eq(services.id, input.id),
        with: {
          integrations: {
            columns: {
              id: true,
            },
          },
        },
      });

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      if (service.integrations.length ?? 0 >= 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Service still has integrations",
        });
      }

      await ctx.db.delete(services).where(eq(services.id, input.id));
    }),
});
