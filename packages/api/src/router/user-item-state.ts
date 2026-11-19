import { ApiError } from "../procedure";
import { z } from "zod/v4";

import { and, eq } from "@homarr/db";
import { boards, items, userItemStates } from "@homarr/db/schema";

import { createApiRouter, protectedProcedure } from "../procedure";
import { throwIfActionForbiddenAsync } from "./board/board-access";

const maxUserItemStateKeys = 500;

const itemStateProcedure = protectedProcedure
  .input(z.object({ itemId: z.string().min(1).max(64) }))
  .use(async ({ context, next }, input) => {
    const item = await context.db.query.items.findFirst({ where: eq(items.id, input.itemId) });
    if (!item) throw new ApiError({ code: "NOT_FOUND", message: "Item not found" });

    await throwIfActionForbiddenAsync(context, eq(boards.id, item.boardId), "view");
    return next();
  });

export const userItemStateRouter = createApiRouter({
  get: itemStateProcedure.query(async ({ context, input }) => {
    const states = await context.db
      .select({ key: userItemStates.key, value: userItemStates.value })
      .from(userItemStates)
      .where(and(eq(userItemStates.userId, context.session.user.id), eq(userItemStates.itemId, input.itemId)));

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
    .mutation(async ({ context, input }) => {
      const userItemWhere = and(
        eq(userItemStates.userId, context.session.user.id),
        eq(userItemStates.itemId, input.itemId),
      );
      const existingState = await context.db.query.userItemStates.findFirst({
        columns: { key: true },
        where: and(userItemWhere, eq(userItemStates.key, input.key)),
      });

      if (!existingState) {
        const stateCount = await context.db.$count(userItemStates, userItemWhere);
        if (stateCount >= maxUserItemStateKeys) {
          throw new ApiError({
            code: "BAD_REQUEST",
            message: `Each user can save at most ${maxUserItemStateKeys} state keys per item. Existing keys can still be updated.`,
          });
        }
      }

      await context.db
        .insert(userItemStates)
        .values({ ...input, userId: context.session.user.id })
        .onConflictDoUpdate({
          target: [userItemStates.userId, userItemStates.itemId, userItemStates.key],
          set: { value: input.value },
        });
    }),
});
