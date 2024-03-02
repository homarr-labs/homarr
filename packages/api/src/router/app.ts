import { asc, createId } from "@homarr/db";
import { apps } from "@homarr/db/schema/sqlite";
import { validation } from "@homarr/validation";

import { createTRPCRouter, publicProcedure } from "../trpc";

export const appRouter = createTRPCRouter({
  all: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.apps.findMany({
      orderBy: asc(apps.name),
    });
  }),
  create: publicProcedure
    .input(validation.app.create)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(apps).values({
        id: createId(),
        name: input.name,
        description: input.description,
        iconUrl: input.iconUrl,
        href: input.href,
      });
    }),
});
