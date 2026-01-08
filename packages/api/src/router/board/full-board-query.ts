import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import z from "zod";

import type { Database, SQL } from "@homarr/db";
import { eq, inArray } from "@homarr/db";
import { boardGroupPermissions, boardUserPermissions, groupMembers, sectionCollapseStates } from "@homarr/db/schema";
import type { WidgetKind } from "@homarr/definitions";
import { emptySuperJSON, widgetKinds } from "@homarr/definitions";
import { zodUnionFromArray } from "@homarr/validation/enums";
import { sectionSchema, sharedItemSchema } from "@homarr/validation/shared";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

export const getFullBoardWithWhereAsync = async (db: Database, where: SQL<unknown>, userId: string | null) => {
  const groupsOfCurrentUser = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, userId ?? ""),
  });
  const board = await db.query.boards.findFirst({
    where,
    with: {
      creator: {
        columns: {
          id: true,
          name: true,
          image: true,
        },
      },
      sections: {
        with: {
          collapseStates: {
            where: eq(sectionCollapseStates.userId, userId ?? ""),
          },
          layouts: true,
        },
      },
      items: {
        with: {
          integrations: {
            with: {
              integration: true,
            },
          },
          layouts: true,
        },
      },
      layouts: true,
      userPermissions: {
        where: eq(boardUserPermissions.userId, userId ?? ""),
        columns: {
          permission: true,
        },
      },
      groupPermissions: {
        where: inArray(boardGroupPermissions.groupId, groupsOfCurrentUser.map((group) => group.groupId).concat("")),
      },
    },
  });

  if (!board) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Board not found",
    });
  }

  const { sections, items, layouts, ...otherBoardProperties } = board;

  return {
    ...otherBoardProperties,
    layouts: layouts
      .map(({ boardId: _, ...layout }) => layout)
      .sort((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint),
    sections: sections.map(({ collapseStates, ...section }) =>
      parseSection({
        ...section,
        xOffset: section.xOffset,
        yOffset: section.yOffset,
        options: superjson.parse(section.options ?? emptySuperJSON),
        layouts: section.layouts.map((layout) => ({
          xOffset: layout.xOffset,
          yOffset: layout.yOffset,
          width: layout.width,
          height: layout.height,
          parentSectionId: layout.parentSectionId,
          layoutId: layout.layoutId,
        })),
        collapsed: collapseStates.at(0)?.collapsed ?? false,
      }),
    ),
    items: items.map(({ integrations: itemIntegrations, ...item }) =>
      parseItem({
        ...item,
        layouts: item.layouts.map((layout) => ({
          xOffset: layout.xOffset,
          yOffset: layout.yOffset,
          width: layout.width,
          height: layout.height,
          layoutId: layout.layoutId,
          sectionId: layout.sectionId,
        })),
        integrationIds: itemIntegrations.map((item) => item.integration.id),
        advancedOptions: superjson.parse<BoardItemAdvancedOptions>(item.advancedOptions),
        options: superjson.parse<Record<string, unknown>>(item.options),
      }),
    ),
  };
};

const forKind = <T extends WidgetKind>(kind: T) =>
  z.object({
    kind: z.literal(kind),
    options: z.record(z.string(), z.unknown()),
  });

const outputItemSchema = zodUnionFromArray(widgetKinds.map((kind) => forKind(kind))).and(sharedItemSchema);

const parseItem = (item: unknown) => {
  const result = outputItemSchema.safeParse(item);

  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
};

const parseSection = (section: unknown) => {
  const result = sectionSchema.safeParse(section);

  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
};
