import { TRPCError } from "@trpc/server";

import { asc, createId, eq, like } from "@homarr/db";
import { apps } from "@homarr/db/schema/sqlite";
import { validation, z } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const appRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.apps.findMany({
      orderBy: asc(apps.name),
    });
  }),
  selectable: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.apps.findMany({
      columns: {
        id: true,
        name: true,
        iconUrl: true,
      },
      orderBy: asc(apps.name),
    });
  }),
  search: publicProcedure
    .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.apps.findMany({
        where: like(apps.name, `%${input.query}%`),
        orderBy: asc(apps.name),
        limit: input.limit,
      });
    }),
  byId: publicProcedure.input(validation.common.byId).query(async ({ ctx, input }) => {
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
  create: publicProcedure.input(validation.app.manage).mutation(async ({ ctx, input }) => {
    await ctx.db.insert(apps).values({
      id: createId(),
      name: input.name,
      description: input.description,
      iconUrl: input.iconUrl,
      href: input.href,
    });
  }),
  update: publicProcedure.input(validation.app.edit).mutation(async ({ ctx, input }) => {
    const app = await ctx.db.query.apps.findFirst({
      where: eq(apps.id, input.id),
    });

    if (!app) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "App not found",
      });
    }

    await ctx.db
      .update(apps)
      .set({
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        href: input.href,
      })
      .where(eq(apps.id, input.id));
  }),
  delete: publicProcedure.input(validation.common.byId).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(apps).where(eq(apps.id, input.id));
  }),
});
