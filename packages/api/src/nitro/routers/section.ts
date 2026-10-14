import { ORPCError } from "@orpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import type { SourceLeafPath } from "../port-map";
import { authenticatedProcedure } from "../procedure";
import type { SectionProcedureResources } from "./-sections/resources";

export type { SectionProcedureResources } from "./-sections/resources";

export const sectionImplementedPaths = ["section.changeCollapsed"] as const satisfies readonly SourceLeafPath[];
export const sectionPendingPaths = [] as const satisfies readonly SourceLeafPath[];

export function createSectionProcedures(resources: SectionProcedureResources) {
  const {
    tables: { sectionCollapseStates, sections },
    operators: { and, eq },
    definitions: { emptySuperJSON },
    schemas: { containerSectionOptionsSchema },
  } = resources;

  return {
    changeCollapsed: authenticatedProcedure({
      path: "section.changeCollapsed",
      kind: "mutation",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(
        z.object({
          sectionId: z.string(),
          collapsed: z.boolean(),
        }),
      )
      .handler(async ({ context, input }) => {
        const section = await context.db.query.sections.findFirst({
          where: eq(sections.id, input.sectionId),
          with: {
            collapseStates: {
              where: eq(sectionCollapseStates.userId, context.principal.user.id),
            },
          },
        });

        if (!section) {
          throw new ORPCError("NOT_FOUND", {
            message: `Section not found id=${input.sectionId}`,
          });
        }

        if (section.kind !== "container") {
          throw new ORPCError("BAD_REQUEST", {
            message: `Section cannot be collapsed id=${input.sectionId}`,
          });
        }

        const rawOptions = superjson.parse<unknown>(section.options ?? emptySuperJSON);
        const parsedOptions = containerSectionOptionsSchema.safeParse(rawOptions);

        if (!parsedOptions.success || !parsedOptions.data.collapsible) {
          throw new ORPCError("BAD_REQUEST", {
            message: `Section cannot be collapsed id=${input.sectionId}`,
          });
        }

        if (section.collapseStates.length === 0) {
          await context.db.insert(sectionCollapseStates).values({
            sectionId: section.id,
            userId: context.principal.user.id,
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
              eq(sectionCollapseStates.userId, context.principal.user.id),
            ),
          );
      }),
  };
}
