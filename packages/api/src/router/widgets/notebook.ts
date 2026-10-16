import { ApiError } from "../../procedure";
import SuperJSON from "superjson";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { boards, items } from "@homarr/db/schema";

import { createApiRouter, protectedProcedure } from "../../procedure";
import { throwIfActionForbiddenAsync } from "../board/board-access";

export const notebookRouter = createApiRouter({
  updateContent: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        content: z.string(),
        boardId: z.string(),
      }),
    )
    .mutation(async ({ context, input }) => {
      await throwIfActionForbiddenAsync(context, eq(boards.id, input.boardId), "modify");

      const item = await context.db.query.items.findFirst({
        where: eq(items.id, input.itemId),
      });

      if (item?.boardId !== input.boardId) {
        throw new ApiError({
          code: "NOT_FOUND",
          message: "Specified item was not found",
        });
      }

      const options = SuperJSON.parse<{ content: string }>(item.options);
      options.content = input.content;
      await context.db
        .update(items)
        .set({ options: SuperJSON.stringify(options) })
        .where(eq(items.id, input.itemId));
    }),
});
