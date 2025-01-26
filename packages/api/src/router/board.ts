import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

import { constructBoardPermissions } from "@homarr/auth/shared";
import type { DeviceType } from "@homarr/common/server";
import type { Database, InferInsertModel, InferSelectModel, SQL } from "@homarr/db";
import { and, createId, eq, handleTransactionsAsync, inArray, like, or } from "@homarr/db";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import {
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  groupPermissions,
  integrationGroupPermissions,
  integrationItems,
  integrationUserPermissions,
  items,
  sectionCollapseStates,
  sections,
  users,
} from "@homarr/db/schema";
import type { WidgetKind } from "@homarr/definitions";
import { getPermissionsWithParents, widgetKinds } from "@homarr/definitions";
import { importOldmarrAsync } from "@homarr/old-import";
import { importJsonFileSchema } from "@homarr/old-import/shared";
import { oldmarrConfigSchema } from "@homarr/old-schema";
import type { BoardItemAdvancedOptions } from "@homarr/validation";
import { createSectionSchema, sharedItemSchema, validation, zodUnionFromArray } from "@homarr/validation";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";

export const boardRouter = createTRPCRouter({
  exists: permissionRequiredProcedure
    .requiresPermission("board-create")
    .input(z.string())
    .query(async ({ ctx, input: name }) => {
      try {
        await noBoardWithSimilarNameAsync(ctx.db, name);
        return false;
      } catch (error) {
        if (error instanceof TRPCError && error.code === "CONFLICT") {
          return true;
        }
        throw error;
      }
    }),
  getPublicBoards: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.boards.findMany({
      columns: {
        id: true,
        name: true,
        logoImageUrl: true,
      },
      where: eq(boards.isPublic, true),
    });
  }),
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
      isMobileHome: currentUserWhenPresent?.mobileHomeBoardId === board.id,
    }));
  }),
  search: publicProcedure
    .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
    .query(async ({ ctx, input }) => {
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

      const foundBoards = await ctx.db.query.boards.findMany({
        where: and(
          like(boards.name, `%${input.query}%`),
          ctx.session?.user.permissions.includes("board-view-all")
            ? undefined
            : or(
                eq(boards.isPublic, true),
                eq(boards.creatorId, ctx.session?.user.id ?? ""),
                inArray(boards.id, boardIds),
              ),
        ),
        limit: input.limit,
        columns: {
          id: true,
          name: true,
          creatorId: true,
          isPublic: true,
          logoImageUrl: true,
        },
        with: {
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
      });

      return foundBoards.map((board) => ({
        id: board.id,
        name: board.name,
        logoImageUrl: board.logoImageUrl,
        permissions: constructBoardPermissions(board, ctx.session),
        isHome: currentUserWhenPresent?.homeBoardId === board.id,
        isMobileHome: currentUserWhenPresent?.mobileHomeBoardId === board.id,
      }));
    }),
  createBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .input(validation.board.create)
    .mutation(async ({ ctx, input }) => {
      const boardId = createId();
      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction.insert(schema.boards).values({
              id: boardId,
              name: input.name,
              isPublic: input.isPublic,
              columnCount: input.columnCount,
              creatorId: ctx.session.user.id,
            });
            await transaction.insert(schema.sections).values({
              id: createId(),
              kind: "empty",
              xOffset: 0,
              yOffset: 0,
              boardId,
            });
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction
              .insert(boards)
              .values({
                id: boardId,
                name: input.name,
                isPublic: input.isPublic,
                columnCount: input.columnCount,
                creatorId: ctx.session.user.id,
              })
              .run();
            transaction
              .insert(sections)
              .values({
                id: createId(),
                kind: "empty",
                xOffset: 0,
                yOffset: 0,
                boardId,
              })
              .run();
          });
        },
      });
    }),
  duplicateBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .input(validation.board.duplicate)
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");
      await noBoardWithSimilarNameAsync(ctx.db, input.name);

      const board = await ctx.db.query.boards.findFirst({
        where: eq(boards.id, input.id),
        with: {
          sections: {
            with: {
              items: {
                with: {
                  integrations: true,
                },
              },
            },
          },
        },
      });

      if (!board) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Board not found",
        });
      }

      const { sections: boardSections, ...boardProps } = board;

      const newBoardId = createId();
      const sectionMap = new Map<string, string>(boardSections.map((section) => [section.id, createId()]));
      const sectionsToInsert: InferInsertModel<typeof sections>[] = boardSections.map(({ items: _, ...section }) => ({
        ...section,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: sectionMap.get(section.id)!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        parentSectionId: section.parentSectionId ? sectionMap.get(section.parentSectionId)! : null,
        boardId: newBoardId,
      }));
      const flatItems = boardSections.flatMap((section) => section.items);
      const itemMap = new Map<string, string>(flatItems.map((item) => [item.id, createId()]));
      const itemsToInsert: InferInsertModel<typeof items>[] = flatItems.map(({ integrations: _, ...item }) => ({
        ...item,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: itemMap.get(item.id)!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        sectionId: sectionMap.get(item.sectionId)!,
      }));

      // Creates a list with all integration ids the user has access to
      const hasAccessForAll = ctx.session.user.permissions.includes("integration-use-all");
      const integrationIdsWithAccess = hasAccessForAll
        ? []
        : await ctx.db
            .selectDistinct({
              id: integrationGroupPermissions.integrationId,
            })
            .from(integrationGroupPermissions)
            .leftJoin(groupMembers, eq(integrationGroupPermissions.groupId, groupMembers.groupId))
            .where(eq(groupMembers.userId, ctx.session.user.id))
            .union(
              ctx.db
                .selectDistinct({ id: integrationUserPermissions.integrationId })
                .from(integrationUserPermissions)
                .where(eq(integrationUserPermissions.userId, ctx.session.user.id)),
            )
            .then((result) => result.map((row) => row.id));

      const itemIntegrationsToInsert = flatItems.flatMap((item) =>
        item.integrations
          // Restrict integrations to only those the user has access to
          .filter(({ integrationId }) => integrationIdsWithAccess.includes(integrationId) || hasAccessForAll)
          .map((integration) => ({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            itemId: itemMap.get(item.id)!,
            integrationId: integration.integrationId,
          })),
      );

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            transaction.insert(schema.boards).values({
              ...boardProps,
              id: newBoardId,
              name: input.name,
              creatorId: ctx.session.user.id,
            });

            if (sectionsToInsert.length > 0) {
              await transaction.insert(schema.sections).values(sectionsToInsert);
            }

            if (itemsToInsert.length > 0) {
              await transaction.insert(schema.items).values(itemsToInsert);
            }

            if (itemIntegrationsToInsert.length > 0) {
              await transaction.insert(schema.integrationItems).values(itemIntegrationsToInsert);
            }
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction
              .insert(boards)
              .values({
                ...boardProps,
                id: newBoardId,
                name: input.name,
                creatorId: ctx.session.user.id,
              })
              .run();

            if (sectionsToInsert.length > 0) {
              transaction.insert(sections).values(sectionsToInsert).run();
            }

            if (itemsToInsert.length > 0) {
              transaction.insert(items).values(itemsToInsert).run();
            }

            if (itemIntegrationsToInsert.length > 0) {
              transaction.insert(integrationItems).values(itemIntegrationsToInsert).run();
            }
          });
        },
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
      const boardSettings = await getServerSettingByKeyAsync(ctx.db, "board");

      if (
        input.visibility !== "public" &&
        (boardSettings.homeBoardId === input.id || boardSettings.mobileHomeBoardId === input.id)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot make home board private",
        });
      }

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
  setMobileHomeBoard: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

    await ctx.db.update(users).set({ mobileHomeBoardId: input.id }).where(eq(users.id, ctx.session.user.id));
  }),
  getHomeBoard: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user.id;
    const user = userId
      ? ((await ctx.db.query.users.findFirst({
          where: eq(users.id, userId),
        })) ?? null)
      : null;

    const homeBoardId = await getHomeIdBoardAsync(ctx.db, user, ctx.deviceType);

    if (!homeBoardId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No home board found",
      });
    }

    const boardWhere = eq(boards.id, homeBoardId);

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

    const dbBoard = await getFullBoardWithWhereAsync(ctx.db, eq(boards.id, input.id), ctx.session.user.id);

    await handleTransactionsAsync(ctx.db, {
      async handleAsync(db, schema) {
        await db.transaction(async (transaction) => {
          const addedSections = filterAddedItems(input.sections, dbBoard.sections);

          if (addedSections.length > 0) {
            await transaction.insert(schema.sections).values(
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
            await transaction.insert(schema.items).values(
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
                  dbRelation.itemId === inputRelation.itemId &&
                  dbRelation.integrationId === inputRelation.integrationId,
              ),
          );

          if (addedIntegrationRelations.length > 0) {
            await transaction.insert(schema.integrationItems).values(
              addedIntegrationRelations.map((relation) => ({
                itemId: relation.itemId,
                integrationId: relation.integrationId,
              })),
            );
          }

          const updatedItems = filterUpdatedItems(inputItems, dbItems);

          for (const item of updatedItems) {
            await transaction
              .update(schema.items)
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
              .update(schema.sections)
              .set({
                yOffset: section.yOffset,
                xOffset: section.xOffset,
                height: prev?.kind === "dynamic" && "height" in section ? section.height : null,
                width: prev?.kind === "dynamic" && "width" in section ? section.width : null,
                parentSectionId:
                  prev?.kind === "dynamic" && "parentSectionId" in section ? section.parentSectionId : null,
                name: prev?.kind === "category" && "name" in section ? section.name : null,
              })
              .where(eq(sections.id, section.id));
          }

          const removedIntegrationRelations = dbIntegrationRelations.filter(
            (dbRelation) =>
              !inputIntegrationRelations.some(
                (inputRelation) =>
                  dbRelation.itemId === inputRelation.itemId &&
                  dbRelation.integrationId === inputRelation.integrationId,
              ),
          );

          for (const relation of removedIntegrationRelations) {
            await transaction
              .delete(schema.integrationItems)
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
            await transaction.delete(schema.items).where(inArray(items.id, itemIds));
          }

          const removedSections = filterRemovedItems(input.sections, dbBoard.sections);
          const sectionIds = removedSections.map((section) => section.id);

          if (sectionIds.length > 0) {
            await transaction.delete(schema.sections).where(inArray(sections.id, sectionIds));
          }
        });
      },
      handleSync(db) {
        db.transaction((transaction) => {
          const addedSections = filterAddedItems(input.sections, dbBoard.sections);

          if (addedSections.length > 0) {
            transaction
              .insert(sections)
              .values(
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
              )
              .run();
          }

          const inputItems = input.sections.flatMap((section) =>
            section.items.map((item) => ({ ...item, sectionId: section.id })),
          );
          const dbItems = dbBoard.sections.flatMap((section) =>
            section.items.map((item) => ({ ...item, sectionId: section.id })),
          );

          const addedItems = filterAddedItems(inputItems, dbItems);

          if (addedItems.length > 0) {
            transaction
              .insert(items)
              .values(
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
              )
              .run();
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
                  dbRelation.itemId === inputRelation.itemId &&
                  dbRelation.integrationId === inputRelation.integrationId,
              ),
          );

          if (addedIntegrationRelations.length > 0) {
            transaction
              .insert(integrationItems)
              .values(
                addedIntegrationRelations.map((relation) => ({
                  itemId: relation.itemId,
                  integrationId: relation.integrationId,
                })),
              )
              .run();
          }

          const updatedItems = filterUpdatedItems(inputItems, dbItems);

          for (const item of updatedItems) {
            transaction
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
              .where(eq(items.id, item.id))
              .run();
          }

          const updatedSections = filterUpdatedItems(input.sections, dbBoard.sections);

          for (const section of updatedSections) {
            const prev = dbBoard.sections.find((dbSection) => dbSection.id === section.id);
            transaction
              .update(sections)
              .set({
                yOffset: section.yOffset,
                xOffset: section.xOffset,
                height: prev?.kind === "dynamic" && "height" in section ? section.height : null,
                width: prev?.kind === "dynamic" && "width" in section ? section.width : null,
                parentSectionId:
                  prev?.kind === "dynamic" && "parentSectionId" in section ? section.parentSectionId : null,
                name: prev?.kind === "category" && "name" in section ? section.name : null,
              })
              .where(eq(sections.id, section.id))
              .run();
          }

          const removedIntegrationRelations = dbIntegrationRelations.filter(
            (dbRelation) =>
              !inputIntegrationRelations.some(
                (inputRelation) =>
                  dbRelation.itemId === inputRelation.itemId &&
                  dbRelation.integrationId === inputRelation.integrationId,
              ),
          );

          for (const relation of removedIntegrationRelations) {
            transaction
              .delete(integrationItems)
              .where(
                and(
                  eq(integrationItems.itemId, relation.itemId),
                  eq(integrationItems.integrationId, relation.integrationId),
                ),
              )
              .run();
          }

          const removedItems = filterRemovedItems(inputItems, dbItems);

          const itemIds = removedItems.map((item) => item.id);
          if (itemIds.length > 0) {
            transaction.delete(items).where(inArray(items.id, itemIds)).run();
          }

          const removedSections = filterRemovedItems(input.sections, dbBoard.sections);
          const sectionIds = removedSections.map((section) => section.id);

          if (sectionIds.length > 0) {
            transaction.delete(sections).where(inArray(sections.id, sectionIds)).run();
          }
        });
      },
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

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction
              .delete(schema.boardUserPermissions)
              .where(eq(boardUserPermissions.boardId, input.entityId));
            if (input.permissions.length === 0) {
              return;
            }
            await transaction.insert(schema.boardUserPermissions).values(
              input.permissions.map((permission) => ({
                userId: permission.principalId,
                permission: permission.permission,
                boardId: input.entityId,
              })),
            );
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction.delete(boardUserPermissions).where(eq(boardUserPermissions.boardId, input.entityId)).run();
            if (input.permissions.length === 0) {
              return;
            }
            transaction
              .insert(boardUserPermissions)
              .values(
                input.permissions.map((permission) => ({
                  userId: permission.principalId,
                  permission: permission.permission,
                  boardId: input.entityId,
                })),
              )
              .run();
          });
        },
      });
    }),
  saveGroupBoardPermissions: protectedProcedure
    .input(validation.board.savePermissions)
    .mutation(async ({ input, ctx }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.entityId), "full");

      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            await transaction
              .delete(schema.boardGroupPermissions)
              .where(eq(boardGroupPermissions.boardId, input.entityId));
            if (input.permissions.length === 0) {
              return;
            }
            await transaction.insert(schema.boardGroupPermissions).values(
              input.permissions.map((permission) => ({
                groupId: permission.principalId,
                permission: permission.permission,
                boardId: input.entityId,
              })),
            );
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            transaction.delete(boardGroupPermissions).where(eq(boardGroupPermissions.boardId, input.entityId)).run();
            if (input.permissions.length === 0) {
              return;
            }
            transaction
              .insert(boardGroupPermissions)
              .values(
                input.permissions.map((permission) => ({
                  groupId: permission.principalId,
                  permission: permission.permission,
                  boardId: input.entityId,
                })),
              )
              .run();
          });
        },
      });
    }),
  importOldmarrConfig: permissionRequiredProcedure
    .requiresPermission("board-create")
    .input(importJsonFileSchema)
    .mutation(async ({ input, ctx }) => {
      const content = await input.file.text();
      const oldmarr = oldmarrConfigSchema.parse(JSON.parse(content));
      await importOldmarrAsync(ctx.db, oldmarr, input.configuration);
    }),
});

/**
 * Get the home board id of the user with the given device type
 * For an example of a user with deviceType = 'mobile' it would go through the following order:
 * 1. user.mobileHomeBoardId
 * 2. user.homeBoardId
 * 3. serverSettings.mobileHomeBoardId
 * 4. serverSettings.homeBoardId
 * 5. show NOT_FOUND error
 */
const getHomeIdBoardAsync = async (
  db: Database,
  user: InferSelectModel<typeof users> | null,
  deviceType: DeviceType,
) => {
  const settingKey = deviceType === "mobile" ? "mobileHomeBoardId" : "homeBoardId";
  if (user?.[settingKey] || user?.homeBoardId) {
    return user[settingKey] ?? user.homeBoardId;
  } else {
    const boardSettings = await getServerSettingByKeyAsync(db, "board");
    return boardSettings[settingKey] ?? boardSettings.homeBoardId;
  }
};

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
          collapseStates: {
            where: eq(sectionCollapseStates.userId, userId ?? ""),
          },
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
    sections: sections.map(({ collapseStates, ...section }) =>
      parseSection({
        ...section,
        collapsed: collapseStates.at(0)?.collapsed ?? false,
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
