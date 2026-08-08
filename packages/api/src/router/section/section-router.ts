import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import { and, eq } from "@homarr/db";
import { sectionCollapseStates, sections } from "@homarr/db/schema";
import { emptySuperJSON } from "@homarr/definitions";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";

import { createTRPCRouter, protectedProcedure } from "../../trpc";

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
        with: {
          collapseStates: {
            where: eq(sectionCollapseStates.userId, ctx.session.user.id),
          },
        },
      });

      if (!section) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Section not found id=${input.sectionId}`,
        });
      }

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

      if (section.collapseStates.length === 0) {
        await ctx.db.insert(sectionCollapseStates).values({
          sectionId: section.id,
          userId: ctx.session.user.id,
          collapsed: input.collapsed,
        });
        return;
      }

      await ctx.db
        .update(sectionCollapseStates)
        .set({
          collapsed: input.collapsed,
        })
        .where(
          and(eq(sectionCollapseStates.sectionId, section.id), eq(sectionCollapseStates.userId, ctx.session.user.id)),
        );
    }),
});
