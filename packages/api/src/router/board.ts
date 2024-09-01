import { TRPCError } from "@trpc/server";
import superjson from "superjson";

import type { Database, SQL } from "@homarr/db";
import { and, createId, eq, inArray, or } from "@homarr/db";
import {
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  groupPermissions,
  integrationItems,
  items,
  sections,
  users,
} from "@homarr/db/schema/sqlite";
import type { WidgetKind } from "@homarr/definitions";
import { getPermissionsWithParents, widgetKinds } from "@homarr/definitions";
import { importAsync, oldmarrConfigSchema } from "@homarr/old-schema";
import type { BoardItemAdvancedOptions } from "@homarr/validation";
import { createSectionSchema, sharedItemSchema, validation, z } from "@homarr/validation";

import { zodUnionFromArray } from "../../../validation/src/enums";
import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";

export const boardRouter = createTRPCRouter({
  getAllBoards: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user.id;
    const permissionsOfCurrentUserWhenPresent = await ctx.db.query.boardUserPermissions.findMany({
      where: eq(boardUserPermissions.userId, userId ?? ""),
    });

    const permissionsOfCurrentUserGroupsWhenPresent = await ctx.db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, userId ?? ""),
      with: {
        group: {
          with: {
            boardPermissions: {},
          },
        },
      },
    });
    const boardIds = permissionsOfCurrentUserWhenPresent
      .map((permission) => permission.boardId)
      .concat(
        permissionsOfCurrentUserGroupsWhenPresent
          .map((groupMember) => groupMember.group.boardPermissions.map((permission) => permission.boardId))
          .flat(),
      );

    const currentUserWhenPresent = await ctx.db.query.users.findFirst({
      where: eq(users.id, userId ?? ""),
    });

    const dbBoards = await ctx.db.query.boards.findMany({
      columns: {
        id: true,
        name: true,
        isPublic: true,
      },
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        userPermissions: {
          where: eq(boardUserPermissions.userId, ctx.session?.user.id ?? ""),
        },
        groupPermissions: {
          where:
            permissionsOfCurrentUserGroupsWhenPresent.length >= 1
              ? inArray(
                  boardGroupPermissions.groupId,
                  permissionsOfCurrentUserGroupsWhenPresent.map((groupMember) => groupMember.groupId),
                )
              : undefined,
        },
      },
      // Allow viewing all boards if the user has the permission
      where: ctx.session?.user.permissions.includes("board-view-all")
        ? undefined
        : or(
            eq(boards.isPublic, true),
            eq(boards.creatorId, ctx.session?.user.id ?? ""),
            boardIds.length > 0 ? inArray(boards.id, boardIds) : undefined,
          ),
    });
    return dbBoards.map((board) => ({
      ...board,
      isHome: currentUserWhenPresent?.homeBoardId === board.id,
    }));
  }),
  createBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .input(validation.board.create)
    .mutation(async ({ ctx, input }) => {
      const boardId = createId();
      await ctx.db.transaction(async (transaction) => {
        await transaction.insert(boards).values({
          id: boardId,
          name: input.name,
          isPublic: input.isPublic,
          columnCount: input.columnCount,
          creatorId: ctx.session.user.id,
        });
        await transaction.insert(sections).values({
          id: createId(),
          kind: "empty",
          xOffset: 0,
          yOffset: 0,
          boardId,
        });
      });
    }),
  renameBoard: protectedProcedure.input(validation.board.rename).mutation(async ({ ctx, input }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

    await noBoardWithSimilarNameAsync(ctx.db, input.name, [input.id]);

    await ctx.db.update(boards).set({ name: input.name }).where(eq(boards.id, input.id));
  }),
  changeBoardVisibility: protectedProcedure
    .input(validation.board.changeVisibility)
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

      await ctx.db
        .update(boards)
        .set({ isPublic: input.visibility === "public" })
        .where(eq(boards.id, input.id));
    }),
  deleteBoard: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

    await ctx.db.delete(boards).where(eq(boards.id, input.id));
  }),
  setHomeBoard: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

    await ctx.db.update(users).set({ homeBoardId: input.id }).where(eq(users.id, ctx.session.user.id));
  }),
  getHomeBoard: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user.id;
    const user = userId
      ? await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
        })
      : null;

    const boardWhere = user?.homeBoardId ? eq(boards.id, user.homeBoardId) : eq(boards.name, "home");
    await throwIfActionForbiddenAsync(ctx, boardWhere, "view");

    return await getFullBoardWithWhereAsync(ctx.db, boardWhere, ctx.session?.user.id ?? null);
  }),
  getBoardByName: publicProcedure.input(validation.board.byName).query(async ({ input, ctx }) => {
    const boardWhere = eq(boards.name, input.name);
    await throwIfActionForbiddenAsync(ctx, boardWhere, "view");

    return await getFullBoardWithWhereAsync(ctx.db, boardWhere, ctx.session?.user.id ?? null);
  }),
  savePartialBoardSettings: protectedProcedure
    .input(validation.board.savePartialSettings.and(z.object({ id: z.string() })))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "modify");

      await ctx.db
        .update(boards)
        .set({
          // general settings
          pageTitle: input.pageTitle,
          metaTitle: input.metaTitle,
          logoImageUrl: input.logoImageUrl,
          faviconImageUrl: input.faviconImageUrl,

          // background settings
          backgroundImageUrl: input.backgroundImageUrl,
          backgroundImageAttachment: input.backgroundImageAttachment,
          backgroundImageRepeat: input.backgroundImageRepeat,
          backgroundImageSize: input.backgroundImageSize,

          // color settings
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          opacity: input.opacity,

          // custom css
          customCss: input.customCss,

          // layout settings
          columnCount: input.columnCount,
        })
        .where(eq(boards.id, input.id));
    }),
  saveBoard: protectedProcedure.input(validation.board.save).mutation(async ({ input, ctx }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "modify");

    await ctx.db.transaction(async (transaction) => {
      const dbBoard = await getFullBoardWithWhereAsync(transaction, eq(boards.id, input.id), ctx.session.user.id);

      const addedSections = filterAddedItems(input.sections, dbBoard.sections);

      if (addedSections.length > 0) {
        await transaction.insert(sections).values(
          addedSections.map((section) => ({
            id: section.id,
            kind: section.kind,
            yOffset: section.yOffset,
            xOffset: section.kind === "dynamic" ? section.xOffset : 0,
            height: "height" in section ? section.height : null,
            width: "width" in section ? section.width : null,
            parentSectionId: "parentSectionId" in section ? section.parentSectionId : null,
            name: "name" in section ? section.name : null,
            boardId: dbBoard.id,
          })),
        );
      }

      const inputItems = input.sections.flatMap((section) =>
        section.items.map((item) => ({ ...item, sectionId: section.id })),
      );
      const dbItems = dbBoard.sections.flatMap((section) =>
        section.items.map((item) => ({ ...item, sectionId: section.id })),
      );

      const addedItems = filterAddedItems(inputItems, dbItems);

      if (addedItems.length > 0) {
        await transaction.insert(items).values(
          addedItems.map((item) => ({
            id: item.id,
            kind: item.kind,
            height: item.height,
            width: item.width,
            xOffset: item.xOffset,
            yOffset: item.yOffset,
            options: superjson.stringify(item.options),
            advancedOptions: superjson.stringify(item.advancedOptions),
            sectionId: item.sectionId,
          })),
        );
      }

      const inputIntegrationRelations = inputItems.flatMap(({ integrationIds, id: itemId }) =>
        integrationIds.map((integrationId) => ({
          integrationId,
          itemId,
        })),
      );
      const dbIntegrationRelations = dbItems.flatMap(({ integrationIds, id: itemId }) =>
        integrationIds.map((integrationId) => ({
          integrationId,
          itemId,
        })),
      );
      const addedIntegrationRelations = inputIntegrationRelations.filter(
        (inputRelation) =>
          !dbIntegrationRelations.some(
            (dbRelation) =>
              dbRelation.itemId === inputRelation.itemId && dbRelation.integrationId === inputRelation.integrationId,
          ),
      );

      if (addedIntegrationRelations.length > 0) {
        await transaction.insert(integrationItems).values(
          addedIntegrationRelations.map((relation) => ({
            itemId: relation.itemId,
            integrationId: relation.integrationId,
          })),
        );
      }

      const updatedItems = filterUpdatedItems(inputItems, dbItems);

      for (const item of updatedItems) {
        await transaction
          .update(items)
          .set({
            kind: item.kind,
            height: item.height,
            width: item.width,
            xOffset: item.xOffset,
            yOffset: item.yOffset,
            options: superjson.stringify(item.options),
            advancedOptions: superjson.stringify(item.advancedOptions),
            sectionId: item.sectionId,
          })
          .where(eq(items.id, item.id));
      }

      const updatedSections = filterUpdatedItems(input.sections, dbBoard.sections);

      for (const section of updatedSections) {
        const prev = dbBoard.sections.find((dbSection) => dbSection.id === section.id);
        await transaction
          .update(sections)
          .set({
            yOffset: section.yOffset,
            xOffset: section.xOffset,
            height: prev?.kind === "dynamic" && "height" in section ? section.height : null,
            width: prev?.kind === "dynamic" && "width" in section ? section.width : null,
            parentSectionId: prev?.kind === "dynamic" && "parentSectionId" in section ? section.parentSectionId : null,
            name: prev?.kind === "category" && "name" in section ? section.name : null,
          })
          .where(eq(sections.id, section.id));
      }

      const removedIntegrationRelations = dbIntegrationRelations.filter(
        (dbRelation) =>
          !inputIntegrationRelations.some(
            (inputRelation) =>
              dbRelation.itemId === inputRelation.itemId && dbRelation.integrationId === inputRelation.integrationId,
          ),
      );

      for (const relation of removedIntegrationRelations) {
        await transaction
          .delete(integrationItems)
          .where(
            and(
              eq(integrationItems.itemId, relation.itemId),
              eq(integrationItems.integrationId, relation.integrationId),
            ),
          );
      }

      const removedItems = filterRemovedItems(inputItems, dbItems);

      const itemIds = removedItems.map((item) => item.id);
      if (itemIds.length > 0) {
        await transaction.delete(items).where(inArray(items.id, itemIds));
      }

      const removedSections = filterRemovedItems(input.sections, dbBoard.sections);
      const sectionIds = removedSections.map((section) => section.id);

      if (sectionIds.length > 0) {
        await transaction.delete(sections).where(inArray(sections.id, sectionIds));
      }
    });
  }),

  getBoardPermissions: protectedProcedure.input(validation.board.permissions).query(async ({ input, ctx }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

    const dbGroupPermissions = await ctx.db.query.groupPermissions.findMany({
      where: inArray(
        groupPermissions.permission,
        getPermissionsWithParents(["board-view-all", "board-modify-all", "board-full-all"]),
      ),
      columns: {
        groupId: false,
      },
      with: {
        group: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    const userPermissions = await ctx.db.query.boardUserPermissions.findMany({
      where: eq(boardUserPermissions.boardId, input.id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    const dbGroupBoardPermission = await ctx.db.query.boardGroupPermissions.findMany({
      where: eq(boardGroupPermissions.boardId, input.id),
      with: {
        group: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      inherited: dbGroupPermissions.sort((permissionA, permissionB) => {
        return permissionA.group.name.localeCompare(permissionB.group.name);
      }),
      users: userPermissions
        .map(({ user, permission }) => ({
          user,
          permission,
        }))
        .sort((permissionA, permissionB) => {
          return (permissionA.user.name ?? "").localeCompare(permissionB.user.name ?? "");
        }),
      groups: dbGroupBoardPermission
        .map(({ group, permission }) => ({
          group: {
            id: group.id,
            name: group.name,
          },
          permission,
        }))
        .sort((permissionA, permissionB) => {
          return permissionA.group.name.localeCompare(permissionB.group.name);
        }),
    };
  }),
  saveUserBoardPermissions: protectedProcedure
    .input(validation.board.savePermissions)
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.entityId), "full");

      await ctx.db.transaction(async (transaction) => {
        await transaction.delete(boardUserPermissions).where(eq(boardUserPermissions.boardId, input.entityId));
        if (input.permissions.length === 0) {
          return;
        }
        await transaction.insert(boardUserPermissions).values(
          input.permissions.map((permission) => ({
            userId: permission.principalId,
            permission: permission.permission,
            boardId: input.entityId,
          })),
        );
      });
    }),
  saveGroupBoardPermissions: protectedProcedure
    .input(validation.board.savePermissions)
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.entityId), "full");

      await ctx.db.transaction(async (transaction) => {
        await transaction.delete(boardGroupPermissions).where(eq(boardGroupPermissions.boardId, input.entityId));
        if (input.permissions.length === 0) {
          return;
        }
        await transaction.insert(boardGroupPermissions).values(
          input.permissions.map((permission) => ({
            groupId: permission.principalId,
            permission: permission.permission,
            boardId: input.entityId,
          })),
        );
      });
    }),
  importOldmarrConfig: protectedProcedure
    .input(validation.board.importOldmarrConfig)
    .mutation(async ({ input, ctx }) => {
      const content = await input.file.text();
      const oldmarr = oldmarrConfigSchema.parse(JSON.parse(content));
      console.log(typeof oldmarr);
      await importAsync(ctx.db, oldmarr, input.configuration);
    }),
});

const noBoardWithSimilarNameAsync = async (db: Database, name: string, ignoredIds: string[] = []) => {
  const boards = await db.query.boards.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  const board = boards.find(
    (board) => board.name.toLowerCase() === name.toLowerCase() && !ignoredIds.includes(board.id),
  );

  if (board) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Board with similar name already exists",
    });
  }
};

const getFullBoardWithWhereAsync = async (db: Database, where: SQL<unknown>, userId: string | null) => {
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
          items: {
            with: {
              integrations: {
                with: {
                  integration: true,
                },
              },
            },
          },
        },
      },
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

  const { sections, ...otherBoardProperties } = board;

  return {
    ...otherBoardProperties,
    sections: sections.map((section) =>
      parseSection({
        ...section,
        items: section.items.map(({ integrations: itemIntegrations, ...item }) => ({
          ...item,
          integrationIds: itemIntegrations.map((item) => item.integration.id),
          advancedOptions: superjson.parse<BoardItemAdvancedOptions>(item.advancedOptions),
          options: superjson.parse<Record<string, unknown>>(item.options),
        })),
      }),
    ),
  };
};

const forKind = <T extends WidgetKind>(kind: T) =>
  z.object({
    kind: z.literal(kind),
    options: z.record(z.unknown()),
  });

const outputItemSchema = zodUnionFromArray(widgetKinds.map((kind) => forKind(kind))).and(sharedItemSchema);

const parseSection = (section: unknown) => {
  const result = createSectionSchema(outputItemSchema).safeParse(section);

  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
};

const filterAddedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  inputArray.filter((inputItem) => !dbArray.some((dbItem) => dbItem.id === inputItem.id));

const filterRemovedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  dbArray.filter((dbItem) => !inputArray.some((inputItem) => dbItem.id === inputItem.id));

const filterUpdatedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  inputArray.filter((inputItem) => dbArray.some((dbItem) => dbItem.id === inputItem.id));
