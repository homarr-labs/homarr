import { ApiError } from "../../procedure";
import superjson from "superjson";
import { z } from "zod/v4";

import { and, eq } from "@homarr/db";
import { sectionCollapseStates, sections } from "@homarr/db/schema";
import { emptySuperJSON } from "@homarr/definitions";
import { containerSectionOptionsSchema } from "@homarr/validation/shared";

import { createApiRouter, protectedProcedure } from "../../procedure";

export const sectionRouter = createApiRouter({
  changeCollapsed: protectedProcedure
    .input(
      z.object({
        sectionId: z.string(),
        collapsed: z.boolean(),
      }),
    )
    .mutation(async ({ context, input }) => {
      const section = await context.db.query.sections.findFirst({
        where: eq(sections.id, input.sectionId),
        with: {
          collapseStates: {
            where: eq(sectionCollapseStates.userId, context.session.user.id),
          },
        },
      });

      if (!section) {
        throw new ApiError({
          code: "NOT_FOUND",
          message: `Section not found id=${input.sectionId}`,
        });
      }

      if (section.kind !== "container") {
        throw new ApiError({
          code: "BAD_REQUEST",
          message: `Section cannot be collapsed id=${input.sectionId}`,
        });
      }

      const rawOptions = superjson.parse(section.options ?? emptySuperJSON);
      const parsedOptions = containerSectionOptionsSchema.safeParse(rawOptions);

      if (!parsedOptions.success || !parsedOptions.data.collapsible) {
        throw new ApiError({
          code: "BAD_REQUEST",
          message: `Section cannot be collapsed id=${input.sectionId}`,
        });
      }

      if (section.collapseStates.length === 0) {
        await context.db.insert(sectionCollapseStates).values({
          sectionId: section.id,
          userId: context.session.user.id,
          collapsed: input.collapsed,
        });
        return;
      }

      await context.db
        .update(sectionCollapseStates)
        .set({
          collapsed: input.collapsed,
        })
        .where(
          and(
            eq(sectionCollapseStates.sectionId, section.id),
            eq(sectionCollapseStates.userId, context.session.user.id),
          ),
        );
    }),
});
