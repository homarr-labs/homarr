import { publicProcedure } from "../trpc";
import { z } from "@homarr/validation";
import { and, eq } from "@homarr/db";
import { items } from "@homarr/db/schema/sqlite";
import { TRPCError } from "@trpc/server";
import type { WidgetKind } from "@homarr/definitions";

export const createOneItemMiddleware = (kind: WidgetKind) => {
  return publicProcedure.input(z.object({ itemId: z.string() })).use(async ({ input, ctx, next }) => {
    const item = await ctx.db.query.items.findFirst({
      where: and(eq(items.id, input.itemId), eq(items.kind, kind)),
    });

    if (!item) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Item with id ${input.itemId} not found`,
      });
    }

    return next({
      ctx: {
        item
      },
    });
  });
};