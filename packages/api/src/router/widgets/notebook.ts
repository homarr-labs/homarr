import { TRPCError } from "@trpc/server";
import SuperJSON from "superjson";

import { eq } from "@homarr/db";
import { items } from "@homarr/db/schema";
import { z } from "@homarr/validation";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const notebookRouter = createTRPCRouter({
  updateContent: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        content: z.string(),
        boardId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.items.findFirst({
        where: eq(items.id, input.itemId),
        with: {
          section: {
            columns: {
              boardId: true,
            },
          },
        },
      });

      if (!item || item.section.boardId !== input.boardId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Specified item was not found",
        });
      }

      const options = SuperJSON.parse<{ content: string }>(item.options);
      options.content = input.content;
      await ctx.db
        .update(items)
        .set({ options: SuperJSON.stringify(options) })
        .where(eq(items.id, input.itemId));
    }),
});
