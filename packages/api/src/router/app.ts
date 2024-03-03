import { TRPCError } from "@trpc/server";

import { asc, createId, eq } from "@homarr/db";
import { apps } from "@homarr/db/schema/sqlite";
import { validation } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const appRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.apps.findMany({
      orderBy: asc(apps.name),
    });
  }),
  byId: publicProcedure
    .input(validation.app.byId)
    .query(async ({ ctx, input }) => {
      const app = await ctx.db.query.apps.findFirst({
        where: eq(apps.id, input.id),
      });

      if (!app) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App not found",
        });
      }

      return app;
    }),
  create: publicProcedure
    .input(validation.app.manage)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(apps).values({
        id: createId(),
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        href: input.href,
      });
    }),
  edit: publicProcedure
    .input(validation.app.edit)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(apps).set({
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        href: input.href,
      });
    }),
});
