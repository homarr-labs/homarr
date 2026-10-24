import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@homarr/db";
import { boards, items, userItemStates } from "@homarr/db/schema";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";

const maxUserItemStateKeys = 500;

const itemStateProcedure = protectedProcedure
  .input(z.object({ itemId: z.string().min(1).max(64) }))
  .use(async ({ ctx, input, next }) => {
    const item = await ctx.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
    if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });

    await throwIfActionForbiddenAsync(ctx, eq(boards.id, item.boardId), "view");
    return next();
  });

export const userItemStateRouter = createTRPCRouter({
  get: itemStateProcedure.query(async ({ ctx, input }) => {
    const states = await ctx.db
      .select({ key: userItemStates.key, value: userItemStates.value })
      .from(userItemStates)
      .where(and(eq(userItemStates.userId, ctx.session.user.id), eq(userItemStates.itemId, input.itemId)));

    return Object.fromEntries(states.map(({ key, value }) => [key, value]));
  }),
  set: itemStateProcedure
    .input(
      z.object({
        key: z.string().min(1).max(255),
        value: z
          .string()
          .max(4096)
          .refine((value) => {
            try {
              JSON.parse(value);
              return true;
            } catch {
              return false;
            }
          }, "Value must be JSON"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userItemWhere = and(
        eq(userItemStates.userId, ctx.session.user.id),
        eq(userItemStates.itemId, input.itemId),
      );
      const existingState = await ctx.db.query.userItemStates.findFirst({
        columns: { key: true },
        where: and(userItemWhere, eq(userItemStates.key, input.key)),
      });

      if (!existingState) {
        const stateCount = await ctx.db.$count(userItemStates, userItemWhere);
        if (stateCount >= maxUserItemStateKeys) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Each user can save at most ${maxUserItemStateKeys} state keys per item. Existing keys can still be updated.`,
          });
        }
      }

      await ctx.db
        .insert(userItemStates)
        .values({ ...input, userId: ctx.session.user.id })
        .onConflictDoUpdate({
          target: [userItemStates.userId, userItemStates.itemId, userItemStates.key],
          set: { value: input.value },
        });
    }),
});
