import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import { eq } from "@homarr/db";
import { boards, sectionCollapseStates, sections } from "@homarr/db/schema";
import { emptySuperJSON } from "@homarr/definitions";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";

import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { throwIfActionForbiddenAsync } from "../board/board-access";

export const sectionRouter = createTRPCRouter({
  changeCollapsed: protectedProcedure
    .input(
      z.object({
        sectionId: z.string(),
        collapsed: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.query.sections.findFirst({
        where: eq(sections.id, input.sectionId),
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Section not found id=${input.sectionId}`,
        });
      }

      await throwIfActionForbiddenAsync(ctx, eq(boards.id, section.boardId), "view");

      if (section.kind !== "container") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Section cannot be collapsed id=${input.sectionId}`,
        });
      }

      const rawOptions = superjson.parse(section.options ?? emptySuperJSON);
      const parsedOptions = containerSectionOptionsSchema.safeParse(rawOptions);

      if (!parsedOptions.success || !parsedOptions.data.collapsible) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Section cannot be collapsed id=${input.sectionId}`,
        });
      }

      await ctx.db
        .insert(sectionCollapseStates)
        .values({
          sectionId: section.id,
          userId: ctx.session.user.id,
          collapsed: input.collapsed,
        })
        .onConflictDoUpdate({
          target: [sectionCollapseStates.userId, sectionCollapseStates.sectionId],
          set: { collapsed: input.collapsed },
        });
    }),
});
