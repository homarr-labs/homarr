import { TRPCError } from "@trpc/server";

import { asc, createId, eq, inArray } from "@homarr/db";
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
        description: true,
        href: true,
      },
      orderBy: asc(apps.name),
    });
  }),
  byId: publicProcedure.input(validation.app.byId).query(async ({ ctx, input }) => {
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
  byIds: publicProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return await ctx.db.query.apps.findMany({
      where: inArray(apps.id, input),
    });
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
  delete: publicProcedure.input(validation.app.byId).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(apps).where(eq(apps.id, input.id));
  }),
});
