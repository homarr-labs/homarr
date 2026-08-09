import { TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { createId } from "@homarr/common";
import type { DeviceType } from "@homarr/common/server";
import type { Database, InferInsertModel, InferSelectModel, SQL } from "@homarr/db";
import { and, asc, eq, handleTransactionsAsync, inArray, isNull, like, not, or, sql } from "@homarr/db";
import { createDbInsertCollectionWithoutTransaction } from "@homarr/db/collection";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import {
  boardGroupPermissions,
  boards,
  boardUserPermissions,
  groupMembers,
  groupPermissions,
  groups,
  integrationGroupPermissions,
  integrationItems,
  integrationUserPermissions,
  itemLayouts,
  items,
  layouts,
  sectionCollapseStates,
  sectionLayouts,
  sections,
  users,
} from "@homarr/db/schema";
import type { WidgetKind } from "@homarr/definitions";
import {
  emptySuperJSON,
  everyoneGroup,
  getPermissionsWithChildren,
  getPermissionsWithParents,
  widgetKinds,
} from "@homarr/definitions";
import { importOldmarrAsync } from "@homarr/old-import";
import { importJsonFileSchema } from "@homarr/old-import/shared";
import { oldmarrConfigSchema } from "@homarr/old-schema";
import {
  addBoardSectionSchema,
  addItemToBoardSchema,
  boardApiDetailSchema,
  boardApiItemSchema,
  boardApiLayoutSchema,
  boardApiSectionSchema,
  boardByNameSchema,
  boardChangeVisibilitySchema,
  boardCreateSchema,
  boardDuplicateSchema,
  boardExportSchema,
  boardImportSchema,
  boardPermissionsOutputSchema,
  boardRenameSchema,
  boardSaveLayoutsSchema,
  boardSavePartialSettingsSchema,
  boardSavePermissionsSchema,
  boardSaveSchema,
  boardSummarySchema,
  removeBoardItemSchema,
  removeBoardSectionSchema,
  updateBoardItemSchema,
  updateBoardSectionSchema,
} from "@homarr/validation/board";
import { byIdSchema } from "@homarr/validation/common";
import { zodUnionFromArray } from "@homarr/validation/enums";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";
import { itemAdvancedOptionsSchema, sectionSchema, sharedItemSchema } from "@homarr/validation/shared";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { throwIfActionForbiddenAsync } from "./board/board-access";
import {
  createBoardExportDocument,
  insertBoardDocumentAsync,
  replaceBoardDocumentAsync,
  throwIfIntegrationsMissingAsync,
} from "./board/board-io";
import { generateResponsiveGridFor } from "./board/grid-algorithm";
import { collectOccupiedAreas, getDefaultSizeForKind, resolvePlacementForAllLayouts } from "./board/item-placement";

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
  getBoardsForGroup: permissionRequiredProcedure
    .requiresPermission("admin")
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      const dbEveryoneAndCurrentGroup = await ctx.db.query.groups.findMany({
        where: or(eq(groups.name, everyoneGroup), eq(groups.id, input.groupId)),
        with: {
          boardPermissions: true,
          permissions: true,
        },
      });

      const distinctPermissions = new Set(
        dbEveryoneAndCurrentGroup.flatMap((group) => group.permissions.map(({ permission }) => permission)),
      );
      const canViewAllBoards = getPermissionsWithChildren([...distinctPermissions]).includes("board-view-all");

      const boardIds = dbEveryoneAndCurrentGroup.flatMap((group) =>
        group.boardPermissions.map(({ boardId }) => boardId),
      );
      const boardWhere = canViewAllBoards ? undefined : or(eq(boards.isPublic, true), inArray(boards.id, boardIds));

      return await ctx.db.query.boards.findMany({
        columns: {
          id: true,
          name: true,
          logoImageUrl: true,
        },
        where: boardWhere,
      });
    }),
  getAllBoards: publicProcedure
    .input(z.void())
    .output(z.array(boardSummarySchema))
    .meta({
      openapi: { method: "GET", path: "/api/boards", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "List all boards the current user can access. Returns id, name, logoImageUrl, isPublic, creator, isHome and isMobileHome flags",
      },
    })
    .query(async ({ ctx }) => {
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
          logoImageUrl: true,
          isPublic: true,
        },
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              image: true,
              email: true,
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
    .meta({
      openapi: { method: "POST", path: "/api/boards", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Create a new board with a name, column count (1-24), and isPublic flag. Returns { boardId }. Requires board-create permission",
      },
    })
    .input(boardCreateSchema)
    .output(z.object({ boardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const boardId = createId();

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          homeBoardId: true,
        },
      });

      const createBoardCollection = createDbInsertCollectionWithoutTransaction(["boards", "sections", "layouts"]);

      createBoardCollection.boards.push({
        id: boardId,
        name: input.name,
        isPublic: input.isPublic,
        creatorId: ctx.session.user.id,
      });
      createBoardCollection.sections.push({
        id: createId(),
        kind: "empty",
        xOffset: 0,
        yOffset: 0,
        boardId,
      });
      createBoardCollection.layouts.push({
        id: createId(),
        name: "Base",
        columnCount: input.columnCount,
        breakpoint: 0,
        boardId,
      });

      await createBoardCollection.insertAllAsync(ctx.db);

      if (!user?.homeBoardId) {
        await ctx.db.update(users).set({ homeBoardId: boardId }).where(eq(users.id, ctx.session.user.id));
      }

      return { boardId };
    }),
  duplicateBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .meta({
      openapi: { method: "POST", path: "/api/boards/{id}/duplicate", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Duplicate an existing board into a new board. Requires board-create permission and view permission on the source board. REQUIRED: id (source board ID), name (unique name for the new board). Returns { boardId }",
      },
    })
    .input(boardDuplicateSchema)
    .output(z.object({ boardId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");
      await noBoardWithSimilarNameAsync(ctx.db, input.name);

      const board = await ctx.db.query.boards.findFirst({
        where: eq(boards.id, input.id),
        with: {
          layouts: true,
          sections: {
            with: {
              collapseStates: true,
              layouts: true,
            },
          },
          items: {
            with: {
              layouts: true,
              integrations: true,
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

      const { sections: boardSections, items: boardItems, layouts: boardLayouts, ...boardProps } = board;

      const newBoardId = createId();

      const layoutsMap = new Map<string, string>(boardLayouts.map((layout) => [layout.id, createId()]));
      const layoutsToInsert = boardLayouts.map((layout) => ({
        ...layout,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: layoutsMap.get(layout.id)!,
        boardId: newBoardId,
      }));

      const sectionMap = new Map<string, string>(boardSections.map((section) => [section.id, createId()]));
      const sectionsToInsert: InferInsertModel<typeof sections>[] = boardSections.map(
        ({ collapseStates: _, layouts: _layouts, ...section }) => ({
          ...section,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: sectionMap.get(section.id)!,
          boardId: newBoardId,
        }),
      );

      const sectionLayoutsToInsert: InferInsertModel<typeof sectionLayouts>[] = boardSections.flatMap((section) =>
        section.layouts.map(
          (layoutSection): InferInsertModel<typeof sectionLayouts> => ({
            ...layoutSection,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            layoutId: layoutsMap.get(layoutSection.layoutId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sectionId: sectionMap.get(layoutSection.sectionId)!,
            parentSectionId: layoutSection.parentSectionId
              ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                sectionMap.get(layoutSection.parentSectionId)!
              : layoutSection.parentSectionId,
          }),
        ),
      );
      const sectionCollapseStatesToInsert: InferInsertModel<typeof sectionCollapseStates>[] = boardSections.flatMap(
        (section) =>
          section.collapseStates.map(
            (collapseState): InferInsertModel<typeof sectionCollapseStates> => ({
              ...collapseState,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              sectionId: sectionMap.get(collapseState.sectionId)!,
            }),
          ),
      );

      const itemMap = new Map<string, string>(boardItems.map((item) => [item.id, createId()]));
      const itemsToInsert: InferInsertModel<typeof items>[] = boardItems.map(
        ({ integrations: _, layouts: _layouts, ...item }) => ({
          ...item,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          id: itemMap.get(item.id)!,
          boardId: newBoardId,
        }),
      );

      const itemLayoutsToInsert: InferInsertModel<typeof itemLayouts>[] = boardItems.flatMap((item) =>
        item.layouts.map(
          (layoutSection): InferInsertModel<typeof itemLayouts> => ({
            ...layoutSection,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            sectionId: sectionMap.get(layoutSection.sectionId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            itemId: itemMap.get(layoutSection.itemId)!,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            layoutId: layoutsMap.get(layoutSection.layoutId)!,
          }),
        ),
      );

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

      const itemIntegrationsToInsert = boardItems.flatMap((item) =>
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
            await transaction.insert(schema.boards).values({
              ...boardProps,
              id: newBoardId,
              name: input.name,
              creatorId: ctx.session.user.id,
            });

            if (layoutsToInsert.length > 0) {
              await transaction.insert(schema.layouts).values(layoutsToInsert);
            }

            if (sectionsToInsert.length > 0) {
              await transaction.insert(schema.sections).values(sectionsToInsert);
            }

            if (sectionLayoutsToInsert.length > 0) {
              await transaction.insert(schema.sectionLayouts).values(sectionLayoutsToInsert);
            }

            if (sectionCollapseStatesToInsert.length > 0) {
              await transaction.insert(schema.sectionCollapseStates).values(sectionCollapseStatesToInsert);
            }

            if (itemsToInsert.length > 0) {
              await transaction.insert(schema.items).values(itemsToInsert);
            }

            if (itemLayoutsToInsert.length > 0) {
              await transaction.insert(schema.itemLayouts).values(itemLayoutsToInsert);
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

            if (layoutsToInsert.length > 0) {
              transaction.insert(layouts).values(layoutsToInsert).run();
            }

            if (sectionsToInsert.length > 0) {
              transaction.insert(sections).values(sectionsToInsert).run();
            }

            if (sectionLayoutsToInsert.length > 0) {
              transaction.insert(sectionLayouts).values(sectionLayoutsToInsert).run();
            }

            if (sectionCollapseStatesToInsert.length > 0) {
              transaction.insert(sectionCollapseStates).values(sectionCollapseStatesToInsert).run();
            }

            if (itemsToInsert.length > 0) {
              transaction.insert(items).values(itemsToInsert).run();
            }

            if (itemLayoutsToInsert.length > 0) {
              transaction.insert(itemLayouts).values(itemLayoutsToInsert).run();
            }

            if (itemIntegrationsToInsert.length > 0) {
              transaction.insert(integrationItems).values(itemIntegrationsToInsert).run();
            }
          });
        },
      });

      return { boardId: newBoardId };
    }),
  renameBoard: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/name", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Rename a board by ID. Requires full permission on the board. REQUIRED: id (board ID), name (new unique board name)",
      },
    })
    .input(boardRenameSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

      await noBoardWithSimilarNameAsync(ctx.db, input.name, [input.id]);

      await ctx.db.update(boards).set({ name: input.name }).where(eq(boards.id, input.id));
    }),
  changeBoardVisibility: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/visibility", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Change board visibility. Requires full permission on the board. REQUIRED: id (board ID), visibility ('public' or 'private'). Home boards cannot be made private",
      },
    })
    .input(boardChangeVisibilitySchema)
    .output(z.void())
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
  deleteBoard: protectedProcedure
    .meta({
      openapi: { method: "DELETE", path: "/api/boards/{id}", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Delete a board by its ID. Requires full permission on the board. Use board_getAllBoards to find the board ID",
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "full");

      await ctx.db.delete(boards).where(eq(boards.id, input.id));
    }),
  setHomeBoard: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/home", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Set the current user's desktop home board. Requires view permission on the board. REQUIRED: id (board ID)",
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      await ctx.db.update(users).set({ homeBoardId: input.id }).where(eq(users.id, ctx.session.user.id));
    }),
  setMobileHomeBoard: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/mobile-home", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Set the current user's mobile home board. Requires view permission on the board. REQUIRED: id (board ID)",
      },
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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
  getBoardByName: publicProcedure.input(boardByNameSchema).query(async ({ input, ctx }) => {
    const boardWhere = eq(sql`UPPER(${boards.name})`, input.name.toUpperCase());
    await throwIfActionForbiddenAsync(ctx, boardWhere, "view");

    return await getFullBoardWithWhereAsync(ctx.db, boardWhere, ctx.session?.user.id ?? null);
  }),
  saveLayouts: protectedProcedure
    .meta({
      openapi: { method: "PUT", path: "/api/boards/{id}/layouts", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Replace the layouts (responsive breakpoints) of a board. REQUIRED: id (board ID), layouts (array of { id, name, columnCount 1-24, breakpoint }). Layouts that are missing from the array are deleted, existing items are re-flowed automatically. Ids of new layouts are generated by the server, the returned array contains the resulting layouts",
      },
    })
    .input(boardSaveLayoutsSchema)
    .output(z.array(boardApiLayoutSchema))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "modify");

      const board = await getFullBoardWithWhereAsync(ctx.db, eq(boards.id, input.id), ctx.session.user.id);

      const addedLayouts = filterAddedItems(input.layouts, board.layouts);

      const layoutsToInsert: InferInsertModel<typeof layouts>[] = [];
      const itemSectionLayoutsToInsert: InferInsertModel<typeof itemLayouts>[] = [];
      const sectionLayoutsToInsert: InferInsertModel<typeof sectionLayouts>[] = [];

      for (const addedLayout of addedLayouts) {
        const layoutId = createId();

        layoutsToInsert.push({
          id: layoutId,
          name: addedLayout.name,
          columnCount: addedLayout.columnCount,
          breakpoint: addedLayout.breakpoint,
          boardId: board.id,
        });

        const sortedLayouts = board.layouts.toSorted((layoutA, layoutB) => layoutA.columnCount - layoutB.columnCount);
        // Fallback to biggest if none exists with columnCount bigger than addedLayout.columnCount
        const layoutToClone =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          sortedLayouts.find((layout) => layout.columnCount >= addedLayout.columnCount) ?? sortedLayouts.at(-1)!;

        const updatedBoardLayout = getUpdatedBoardLayout(board, {
          previous: {
            layoutId: layoutToClone.id,
            columnCount: layoutToClone.columnCount,
          },
          current: {
            layoutId,
            columnCount: addedLayout.columnCount,
          },
        });

        itemSectionLayoutsToInsert.push(...updatedBoardLayout.itemSectionLayouts);
        sectionLayoutsToInsert.push(...updatedBoardLayout.sectionLayouts);
      }

      if (layoutsToInsert.length > 0) {
        await ctx.db.insert(layouts).values(layoutsToInsert);
      }

      if (itemSectionLayoutsToInsert.length > 0) {
        await ctx.db.insert(itemLayouts).values(itemSectionLayoutsToInsert);
      }

      if (sectionLayoutsToInsert.length > 0) {
        await ctx.db.insert(sectionLayouts).values(sectionLayoutsToInsert);
      }

      const updatedLayouts = filterUpdatedItems(input.layouts, board.layouts);
      for (const updatedLayout of updatedLayouts) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const dbLayout = board.layouts.find((layout) => layout.id === updatedLayout.id)!;

        if (dbLayout.columnCount !== updatedLayout.columnCount) {
          const updatedBoardLayout = getUpdatedBoardLayout(board, {
            previous: {
              layoutId: dbLayout.id,
              columnCount: dbLayout.columnCount,
            },
            current: {
              layoutId: dbLayout.id,
              columnCount: updatedLayout.columnCount,
            },
          });

          for (const itemSectionLayout of updatedBoardLayout.itemSectionLayouts) {
            await ctx.db
              .update(itemLayouts)
              .set({
                height: itemSectionLayout.height,
                width: itemSectionLayout.width,
                xOffset: itemSectionLayout.xOffset,
                yOffset: itemSectionLayout.yOffset,
                sectionId: itemSectionLayout.sectionId,
              })
              .where(
                and(
                  eq(itemLayouts.itemId, itemSectionLayout.itemId),
                  eq(itemLayouts.layoutId, itemSectionLayout.layoutId),
                ),
              );
          }

          for (const sectionLayout of updatedBoardLayout.sectionLayouts) {
            await ctx.db
              .update(sectionLayouts)
              .set({
                height: sectionLayout.height,
                width: sectionLayout.width,
                xOffset: sectionLayout.xOffset,
                yOffset: sectionLayout.yOffset,
                parentSectionId: sectionLayout.parentSectionId,
              })
              .where(
                and(
                  eq(sectionLayouts.sectionId, sectionLayout.sectionId),
                  eq(sectionLayouts.layoutId, sectionLayout.layoutId),
                ),
              );
          }
        }

        await ctx.db
          .update(layouts)
          .set({
            name: updatedLayout.name,
            columnCount: updatedLayout.columnCount,
            breakpoint: updatedLayout.breakpoint,
          })
          .where(eq(layouts.id, updatedLayout.id));
      }

      const removedLayouts = filterRemovedItems(input.layouts, board.layouts);
      const removedLayoutIds = removedLayouts.map((layout) => layout.id);
      if (removedLayoutIds.length > 0) {
        await ctx.db.delete(layouts).where(inArray(layouts.id, removedLayoutIds));
      }

      return await getBoardLayoutsAsync(ctx.db, input.id);
    }),
  savePartialBoardSettings: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{id}/settings", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Update visual and behavior settings for a board. Requires modify permission. REQUIRED: id (board ID). Optional fields include pageTitle, metaTitle, logoImageUrl, faviconImageUrl, backgroundImageUrl, colors, opacity, customCss, itemRadius, and disableStatus",
      },
    })
    .input(boardSavePartialSettingsSchema.extend({ id: z.string() }))
    .output(z.void())
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

          // appearance settings
          primaryColor: input.primaryColor,
          secondaryColor: input.secondaryColor,
          opacity: input.opacity,
          iconColor: input.iconColor,
          itemRadius: input.itemRadius,

          // custom css
          customCss: input.customCss,

          // Behavior settings
          disableStatus: input.disableStatus,
        })
        .where(eq(boards.id, input.id));
    }),
  saveBoard: protectedProcedure.input(boardSaveSchema).mutation(async ({ input, ctx }) => {
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
                yOffset: section.kind !== "dynamic" ? section.yOffset : null,
                xOffset: section.kind === "dynamic" ? null : 0,
                options: section.kind === "dynamic" ? superjson.stringify(section.options) : emptySuperJSON,
                name: "name" in section ? section.name : null,
                boardId: dbBoard.id,
              })),
            );

            if (addedSections.some((section) => section.kind === "dynamic")) {
              await transaction.insert(schema.sectionLayouts).values(
                addedSections
                  .filter((section) => section.kind === "dynamic")
                  .flatMap((section) =>
                    section.layouts.map(
                      (sectionLayout): InferInsertModel<typeof schema.sectionLayouts> => ({
                        layoutId: sectionLayout.layoutId,
                        sectionId: section.id,
                        parentSectionId: sectionLayout.parentSectionId,
                        height: sectionLayout.height,
                        width: sectionLayout.width,
                        xOffset: sectionLayout.xOffset,
                        yOffset: sectionLayout.yOffset,
                      }),
                    ),
                  ),
              );
            }
          }

          const addedItems = filterAddedItems(input.items, dbBoard.items);

          if (addedItems.length > 0) {
            await transaction.insert(schema.items).values(
              addedItems.map((item) => ({
                id: item.id,
                kind: item.kind,
                options: superjson.stringify(item.options),
                advancedOptions: superjson.stringify(item.advancedOptions),
                boardId: dbBoard.id,
              })),
            );
            await transaction.insert(schema.itemLayouts).values(
              addedItems.flatMap((item) =>
                item.layouts.map(
                  (layoutSection): InferInsertModel<typeof schema.itemLayouts> => ({
                    layoutId: layoutSection.layoutId,
                    sectionId: layoutSection.sectionId,
                    itemId: item.id,
                    height: layoutSection.height,
                    width: layoutSection.width,
                    xOffset: layoutSection.xOffset,
                    yOffset: layoutSection.yOffset,
                  }),
                ),
              ),
            );
          }

          const inputIntegrationRelations = input.items.flatMap(({ integrationIds, id: itemId }) =>
            integrationIds.map((integrationId) => ({
              integrationId,
              itemId,
            })),
          );
          const dbIntegrationRelations = dbBoard.items.flatMap(({ integrationIds, id: itemId }) =>
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

          const updatedItems = filterUpdatedItems(input.items, dbBoard.items);

          for (const item of updatedItems) {
            await transaction
              .update(schema.items)
              .set({
                kind: item.kind,
                options: superjson.stringify(item.options),
                advancedOptions: superjson.stringify(item.advancedOptions),
              })
              .where(eq(schema.items.id, item.id));

            for (const itemSectionLayout of item.layouts) {
              await transaction
                .update(schema.itemLayouts)
                .set({
                  height: itemSectionLayout.height,
                  width: itemSectionLayout.width,
                  xOffset: itemSectionLayout.xOffset,
                  yOffset: itemSectionLayout.yOffset,
                  sectionId: itemSectionLayout.sectionId,
                })
                .where(
                  and(
                    eq(schema.itemLayouts.itemId, item.id),
                    eq(schema.itemLayouts.layoutId, itemSectionLayout.layoutId),
                  ),
                );
            }
          }

          const updatedSections = filterUpdatedItems(input.sections, dbBoard.sections);

          for (const section of updatedSections) {
            const prev = dbBoard.sections.find((dbSection) => dbSection.id === section.id);
            await transaction
              .update(schema.sections)
              .set({
                yOffset: prev?.kind !== "dynamic" && "yOffset" in section ? section.yOffset : null,
                xOffset: prev?.kind !== "dynamic" && "yOffset" in section ? 0 : null,
                options: section.kind === "dynamic" ? superjson.stringify(section.options) : emptySuperJSON,
                name: prev?.kind === "category" && "name" in section ? section.name : null,
              })
              .where(eq(schema.sections.id, section.id));

            if (section.kind !== "dynamic") continue;

            for (const sectionLayout of section.layouts) {
              await transaction
                .update(schema.sectionLayouts)
                .set({
                  height: sectionLayout.height,
                  width: sectionLayout.width,
                  xOffset: sectionLayout.xOffset,
                  yOffset: sectionLayout.yOffset,
                  parentSectionId: sectionLayout.parentSectionId,
                })
                .where(
                  and(
                    eq(schema.sectionLayouts.sectionId, section.id),
                    eq(schema.sectionLayouts.layoutId, sectionLayout.layoutId),
                  ),
                );
            }
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

          const removedItems = filterRemovedItems(input.items, dbBoard.items);

          const itemIds = removedItems.map((item) => item.id);
          if (itemIds.length > 0) {
            await transaction.delete(schema.items).where(inArray(schema.items.id, itemIds));
          }

          const removedSections = filterRemovedItems(input.sections, dbBoard.sections);
          const sectionIds = removedSections.map((section) => section.id);

          if (sectionIds.length > 0) {
            await transaction.delete(schema.sections).where(inArray(schema.sections.id, sectionIds));
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
                  yOffset: section.kind !== "dynamic" ? section.yOffset : null,
                  xOffset: section.kind === "dynamic" ? null : 0,
                  options: section.kind === "dynamic" ? superjson.stringify(section.options) : emptySuperJSON,
                  name: "name" in section ? section.name : null,
                  boardId: dbBoard.id,
                })),
              )
              .run();

            if (addedSections.some((section) => section.kind === "dynamic")) {
              transaction
                .insert(sectionLayouts)
                .values(
                  addedSections
                    .filter((section) => section.kind === "dynamic")
                    .flatMap((section) =>
                      section.layouts.map(
                        (sectionLayout): InferInsertModel<typeof sectionLayouts> => ({
                          layoutId: sectionLayout.layoutId,
                          sectionId: section.id,
                          parentSectionId: sectionLayout.parentSectionId,
                          height: sectionLayout.height,
                          width: sectionLayout.width,
                          xOffset: sectionLayout.xOffset,
                          yOffset: sectionLayout.yOffset,
                        }),
                      ),
                    ),
                )
                .run();
            }
          }

          const addedItems = filterAddedItems(input.items, dbBoard.items);

          if (addedItems.length > 0) {
            transaction
              .insert(items)
              .values(
                addedItems.map((item) => ({
                  id: item.id,
                  kind: item.kind,
                  options: superjson.stringify(item.options),
                  advancedOptions: superjson.stringify(item.advancedOptions),
                  boardId: dbBoard.id,
                })),
              )
              .run();
            transaction
              .insert(itemLayouts)
              .values(
                addedItems.flatMap((item) =>
                  item.layouts.map(
                    (layoutSection): InferInsertModel<typeof itemLayouts> => ({
                      layoutId: layoutSection.layoutId,
                      sectionId: layoutSection.sectionId,
                      itemId: item.id,
                      height: layoutSection.height,
                      width: layoutSection.width,
                      xOffset: layoutSection.xOffset,
                      yOffset: layoutSection.yOffset,
                    }),
                  ),
                ),
              )
              .run();
          }

          const inputIntegrationRelations = input.items.flatMap(({ integrationIds, id: itemId }) =>
            integrationIds.map((integrationId) => ({
              integrationId,
              itemId,
            })),
          );
          const dbIntegrationRelations = dbBoard.items.flatMap(({ integrationIds, id: itemId }) =>
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

          const updatedItems = filterUpdatedItems(input.items, dbBoard.items);

          for (const item of updatedItems) {
            transaction
              .update(items)
              .set({
                kind: item.kind,
                options: superjson.stringify(item.options),
                advancedOptions: superjson.stringify(item.advancedOptions),
              })
              .where(eq(items.id, item.id))
              .run();

            for (const itemSectionLayout of item.layouts) {
              transaction
                .update(itemLayouts)
                .set({
                  height: itemSectionLayout.height,
                  width: itemSectionLayout.width,
                  xOffset: itemSectionLayout.xOffset,
                  yOffset: itemSectionLayout.yOffset,
                  sectionId: itemSectionLayout.sectionId,
                })
                .where(and(eq(itemLayouts.itemId, item.id), eq(itemLayouts.layoutId, itemSectionLayout.layoutId)))
                .run();
            }
          }

          const updatedSections = filterUpdatedItems(input.sections, dbBoard.sections);

          for (const section of updatedSections) {
            const prev = dbBoard.sections.find((dbSection) => dbSection.id === section.id);
            transaction
              .update(sections)
              .set({
                yOffset: prev?.kind !== "dynamic" && "yOffset" in section ? section.yOffset : null,
                xOffset: prev?.kind !== "dynamic" && "yOffset" in section ? 0 : null,
                options: section.kind === "dynamic" ? superjson.stringify(section.options) : emptySuperJSON,
                name: prev?.kind === "category" && "name" in section ? section.name : null,
              })
              .where(eq(sections.id, section.id))
              .run();

            if (section.kind !== "dynamic") continue;

            for (const sectionLayout of section.layouts) {
              transaction
                .update(sectionLayouts)
                .set({
                  height: sectionLayout.height,
                  width: sectionLayout.width,
                  xOffset: sectionLayout.xOffset,
                  yOffset: sectionLayout.yOffset,
                  parentSectionId: sectionLayout.parentSectionId,
                })
                .where(
                  and(eq(sectionLayouts.sectionId, section.id), eq(sectionLayouts.layoutId, sectionLayout.layoutId)),
                )
                .run();
            }
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

          const removedItems = filterRemovedItems(input.items, dbBoard.items);

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
  getBoardPermissions: protectedProcedure
    .meta({
      openapi: { method: "GET", path: "/api/boards/{id}/permissions", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "List who can access a board. Returns 'inherited' (groups with a global board permission), 'users' and 'groups' with the permission granted on this board. REQUIRED: id (board ID). Requires full permission on the board",
      },
    })
    .input(byIdSchema)
    .output(boardPermissionsOutputSchema)
    .query(async ({ input, ctx }) => {
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
              email: true,
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
        inherited: dbGroupPermissions.toSorted((permissionA, permissionB) => {
          return permissionA.group.name.localeCompare(permissionB.group.name);
        }),
        users: userPermissions
          .map(({ user, permission }) => ({
            user,
            permission,
          }))
          .toSorted((permissionA, permissionB) => {
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
          .toSorted((permissionA, permissionB) => {
            return permissionA.group.name.localeCompare(permissionB.group.name);
          }),
      };
    }),
  saveUserBoardPermissions: protectedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/boards/{entityId}/permissions/users",
        tags: ["boards"],
        protect: true,
      },
      mcp: {
        enabled: true,
        description:
          "Replace the per user permissions of a board. REQUIRED: entityId (board ID), permissions (array of { principalId: user ID, permission: 'view' | 'modify' | 'full' }). Users missing from the array lose their access",
      },
    })
    .input(boardSavePermissionsSchema)
    .output(z.void())
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
    .meta({
      openapi: {
        method: "PUT",
        path: "/api/boards/{entityId}/permissions/groups",
        tags: ["boards"],
        protect: true,
      },
      mcp: {
        enabled: true,
        description:
          "Replace the per group permissions of a board. REQUIRED: entityId (board ID), permissions (array of { principalId: group ID, permission: 'view' | 'modify' | 'full' }). Groups missing from the array lose their access",
      },
    })
    .input(boardSavePermissionsSchema)
    .output(z.void())
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
  addItem: protectedProcedure
    .meta({
      openapi: { method: "POST", path: "/api/boards/items", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Add a widget/app item to a board. Provide boardId (from board_getAllBoards), kind (widget type like 'app', 'weather', etc.), optional options map, and optional integrationIds array. Placement is optional: without it the item is placed automatically with its default size in the first empty section. Provide width/height to control the size, xOffset/yOffset for an exact position, sectionId to target a specific section, or a layouts array for per-breakpoint control. Returns { itemId }",
      },
    })
    .input(addItemToBoardSchema)
    .output(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      await throwIfIntegrationsMissingAsync(ctx.db, input.integrationIds);

      const board = await getBoardForPlacementAsync(ctx.db, input.boardId);

      const placements = resolvePlacementForAllLayouts({
        board,
        placement: input,
        occupiedAreas: collectOccupiedAreas(board),
        defaultSize: getDefaultSizeForKind(input.kind),
      });

      const itemId = createId();

      await ctx.db.insert(items).values({
        id: itemId,
        boardId: input.boardId,
        kind: input.kind,
        options: superjson.stringify(input.options),
        advancedOptions: input.advancedOptions ? superjson.stringify(input.advancedOptions) : emptySuperJSON,
      });

      if (placements.length > 0) {
        await ctx.db.insert(itemLayouts).values(placements.map((placement) => ({ itemId, ...placement })));
      }

      if (input.integrationIds.length > 0) {
        await ctx.db
          .insert(integrationItems)
          .values(input.integrationIds.map((integrationId) => ({ itemId, integrationId })));
      }

      return { itemId };
    }),
  updateItem: protectedProcedure
    .meta({
      openapi: { method: "PATCH", path: "/api/boards/{boardId}/items/{itemId}", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Update an existing board item. REQUIRED: boardId, itemId. All other fields are optional and only the provided ones are changed: options, advancedOptions, integrationIds, and the placement (sectionId, xOffset, yOffset, width, height or a layouts array). Values that are not provided keep their current placement, so an item can be resized and moved in a single call",
      },
    })
    .input(updateBoardItemSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      const board = await getBoardForPlacementAsync(ctx.db, input.boardId);
      const item = board.items.find((boardItem) => boardItem.id === input.itemId);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      if (input.integrationIds) {
        await throwIfIntegrationsMissingAsync(ctx.db, input.integrationIds);
      }

      if (input.options !== undefined || input.advancedOptions !== undefined) {
        await ctx.db
          .update(items)
          .set({
            ...(input.options !== undefined ? { options: superjson.stringify(input.options) } : {}),
            ...(input.advancedOptions !== undefined
              ? { advancedOptions: superjson.stringify(input.advancedOptions) }
              : {}),
          })
          .where(eq(items.id, input.itemId));
      }

      if (hasPlacementChanges(input)) {
        throwIfLayoutsUnknown(board, input.layouts);

        // Merge the requested changes with the current placement so unspecified
        // properties keep their value instead of triggering an automatic placement.
        const mergedLayouts = board.layouts.map((layout) => {
          const current = item.layouts.find((itemLayout) => itemLayout.layoutId === layout.id);
          const explicit = input.layouts?.find((entry) => entry.layoutId === layout.id);

          if (explicit) {
            // Without this the item would fall back to the first empty section of the board
            return { ...explicit, sectionId: explicit.sectionId ?? input.sectionId ?? current?.sectionId };
          }

          const width = Math.min(input.width ?? current?.width ?? 1, layout.columnCount);

          return {
            layoutId: layout.id,
            sectionId: input.sectionId ?? current?.sectionId,
            xOffset: Math.min(input.xOffset ?? current?.xOffset ?? 0, layout.columnCount - width),
            yOffset: input.yOffset ?? current?.yOffset ?? 0,
            width,
            height: input.height ?? current?.height ?? 1,
          };
        });

        const placements = resolvePlacementForAllLayouts({
          board,
          placement: { sectionId: input.sectionId, layouts: mergedLayouts },
          occupiedAreas: collectOccupiedAreas(board, [input.itemId]),
          defaultSize: getDefaultSizeForKind(item.kind),
        });

        // Updated in place instead of delete + insert, so a failure can never leave the
        // item without any position, which would make it disappear from the board.
        for (const placement of placements) {
          const exists = item.layouts.some((itemLayout) => itemLayout.layoutId === placement.layoutId);

          if (!exists) {
            await ctx.db.insert(itemLayouts).values({ itemId: input.itemId, ...placement });
            continue;
          }

          await ctx.db
            .update(itemLayouts)
            .set({
              sectionId: placement.sectionId,
              xOffset: placement.xOffset,
              yOffset: placement.yOffset,
              width: placement.width,
              height: placement.height,
            })
            .where(and(eq(itemLayouts.itemId, input.itemId), eq(itemLayouts.layoutId, placement.layoutId)));
        }
      }

      const requestedIntegrationIds = input.integrationIds;
      if (requestedIntegrationIds) {
        // Only the difference is applied so the item never temporarily loses all of its integrations
        const currentIntegrationIds = item.integrations.map(({ integrationId }) => integrationId);
        const removed = currentIntegrationIds.filter((id) => !requestedIntegrationIds.includes(id));
        const added = requestedIntegrationIds.filter((id) => !currentIntegrationIds.includes(id));

        if (removed.length > 0) {
          await ctx.db
            .delete(integrationItems)
            .where(and(eq(integrationItems.itemId, input.itemId), inArray(integrationItems.integrationId, removed)));
        }

        if (added.length > 0) {
          await ctx.db
            .insert(integrationItems)
            .values(added.map((integrationId) => ({ itemId: input.itemId, integrationId })));
        }
      }
    }),
  removeItem: protectedProcedure
    .meta({
      openapi: { method: "DELETE", path: "/api/boards/{boardId}/items/{itemId}", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description: "Remove an item from a board. REQUIRED: boardId, itemId. Requires modify permission",
      },
    })
    .input(removeBoardItemSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      const item = await ctx.db.query.items.findFirst({
        columns: { id: true },
        where: and(eq(items.id, input.itemId), eq(items.boardId, input.boardId)),
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      await ctx.db.delete(items).where(eq(items.id, input.itemId));
    }),
  getItems: publicProcedure
    .meta({
      openapi: { method: "GET", path: "/api/boards/{id}/items", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "List all items of a board including their per-layout position and size. REQUIRED: id (board ID). Requires view permission",
      },
    })
    .input(byIdSchema)
    .output(z.array(boardApiItemSchema))
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      const board = await getBoardForPlacementAsync(ctx.db, input.id);
      return board.items.map(mapItemToApi);
    }),
  getSections: publicProcedure
    .meta({
      openapi: { method: "GET", path: "/api/boards/{id}/sections", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description: "List all sections of a board. REQUIRED: id (board ID). Requires view permission",
      },
    })
    .input(byIdSchema)
    .output(z.array(boardApiSectionSchema))
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      const board = await getBoardForPlacementAsync(ctx.db, input.id);
      return board.sections.map(mapSectionToApi);
    }),
  addSection: protectedProcedure
    .meta({
      openapi: { method: "POST", path: "/api/boards/{boardId}/sections", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Add a section to a board. REQUIRED: boardId, kind ('empty', 'category' or 'dynamic'). Category sections take a name and a yOffset, empty sections take a yOffset. Dynamic sections are placed inside another section and accept width/height/xOffset/yOffset/parentSectionId or a layouts array. Returns { sectionId }",
      },
    })
    .input(addBoardSectionSchema)
    .output(z.object({ sectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      if (input.kind === "category" && !input.name) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Category sections require a name" });
      }

      const board = await getBoardForPlacementAsync(ctx.db, input.boardId);
      const sectionId = createId();

      const sectionLayoutRows: InferInsertModel<typeof sectionLayouts>[] =
        input.kind === "dynamic"
          ? resolvePlacementForAllLayouts({
              board,
              placement: toSectionPlacement(input),
              occupiedAreas: collectOccupiedAreas(board),
              defaultSize: { width: 1, height: 1 },
              context: "the section",
            }).map((placement) => ({
              sectionId,
              layoutId: placement.layoutId,
              parentSectionId: placement.sectionId,
              xOffset: placement.xOffset,
              yOffset: placement.yOffset,
              width: placement.width,
              height: placement.height,
            }))
          : [];

      await ctx.db.insert(sections).values({
        id: sectionId,
        boardId: input.boardId,
        kind: input.kind,
        name: input.kind === "category" ? (input.name ?? null) : null,
        xOffset: input.kind === "dynamic" ? null : 0,
        yOffset: input.kind === "dynamic" ? null : (input.yOffset ?? nextSectionYOffset(board)),
        options: input.kind === "dynamic" ? superjson.stringify(input.options ?? {}) : emptySuperJSON,
      });

      if (sectionLayoutRows.length > 0) {
        await ctx.db.insert(sectionLayouts).values(sectionLayoutRows);
      }

      return { sectionId };
    }),
  updateSection: protectedProcedure
    .meta({
      openapi: {
        method: "PATCH",
        path: "/api/boards/{boardId}/sections/{sectionId}",
        tags: ["boards"],
        protect: true,
      },
      mcp: {
        enabled: true,
        description:
          "Update a section of a board. REQUIRED: boardId, sectionId. Optional: name and yOffset for category/empty sections, options and placement (parentSectionId, xOffset, yOffset, width, height or layouts) for dynamic sections",
      },
    })
    .input(updateBoardSectionSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      const board = await getBoardForPlacementAsync(ctx.db, input.boardId);
      const section = board.sections.find((boardSection) => boardSection.id === input.sectionId);

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      if (section.kind !== "dynamic") {
        // Only a category has a name, so patching one on an empty section must not end up
        // as an update without any value, which the query builder rejects
        const values = {
          ...(input.name !== undefined && section.kind === "category" ? { name: input.name } : {}),
          ...(input.yOffset !== undefined ? { yOffset: input.yOffset } : {}),
        };

        if (Object.keys(values).length > 0) {
          await ctx.db.update(sections).set(values).where(eq(sections.id, input.sectionId));
        }

        return;
      }

      if (input.options !== undefined) {
        await ctx.db
          .update(sections)
          .set({ options: superjson.stringify(input.options) })
          .where(eq(sections.id, input.sectionId));
      }

      if (!hasPlacementChanges({ ...input, sectionId: input.parentSectionId })) return;

      throwIfLayoutsUnknown(board, input.layouts);

      const mergedLayouts = board.layouts.map((layout) => {
        const explicit = input.layouts?.find((entry) => entry.layoutId === layout.id);
        const current = section.layouts.find((sectionLayout) => sectionLayout.layoutId === layout.id);

        if (explicit) {
          return {
            layoutId: explicit.layoutId,
            sectionId: explicit.parentSectionId ?? current?.parentSectionId ?? undefined,
            xOffset: explicit.xOffset,
            yOffset: explicit.yOffset,
            width: explicit.width,
            height: explicit.height,
          };
        }

        const width = Math.min(input.width ?? current?.width ?? 1, layout.columnCount);

        return {
          layoutId: layout.id,
          sectionId: input.parentSectionId ?? current?.parentSectionId ?? undefined,
          xOffset: Math.min(input.xOffset ?? current?.xOffset ?? 0, layout.columnCount - width),
          yOffset: input.yOffset ?? current?.yOffset ?? 0,
          width,
          height: input.height ?? current?.height ?? 1,
        };
      });

      const placements = resolvePlacementForAllLayouts({
        board,
        placement: { sectionId: input.parentSectionId, layouts: mergedLayouts },
        occupiedAreas: collectOccupiedAreas(board, [input.sectionId]),
        defaultSize: { width: 1, height: 1 },
        context: "the section",
      });

      // Updated in place instead of delete + insert for the same reason as in updateItem
      for (const placement of placements) {
        const exists = section.layouts.some((sectionLayout) => sectionLayout.layoutId === placement.layoutId);

        if (!exists) {
          await ctx.db.insert(sectionLayouts).values({
            sectionId: input.sectionId,
            layoutId: placement.layoutId,
            parentSectionId: placement.sectionId,
            xOffset: placement.xOffset,
            yOffset: placement.yOffset,
            width: placement.width,
            height: placement.height,
          });
          continue;
        }

        await ctx.db
          .update(sectionLayouts)
          .set({
            parentSectionId: placement.sectionId,
            xOffset: placement.xOffset,
            yOffset: placement.yOffset,
            width: placement.width,
            height: placement.height,
          })
          .where(and(eq(sectionLayouts.sectionId, input.sectionId), eq(sectionLayouts.layoutId, placement.layoutId)));
      }
    }),
  removeSection: protectedProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/api/boards/{boardId}/sections/{sectionId}",
        tags: ["boards"],
        protect: true,
      },
      mcp: {
        enabled: true,
        description:
          "Remove a section and all of its items from a board. REQUIRED: boardId, sectionId. The last empty section of a board cannot be removed",
      },
    })
    .input(removeBoardSectionSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.boardId), "modify");

      const board = await getBoardForPlacementAsync(ctx.db, input.boardId);
      const section = board.sections.find((boardSection) => boardSection.id === input.sectionId);

      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      if (section.kind === "empty" && board.sections.filter(({ kind }) => kind === "empty").length <= 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The last empty section of a board cannot be removed" });
      }

      // Items reference the board and not the section, so deleting a section would only cascade
      // its layout rows and leave the items behind without any position on the board.
      const removedSectionIds = collectNestedSectionIds(board, input.sectionId);
      const orphanedItemIds = board.items
        .filter(
          (item) => item.layouts.length > 0 && item.layouts.every((layout) => removedSectionIds.has(layout.sectionId)),
        )
        .map((item) => item.id);

      const sectionIdsToRemove = [...removedSectionIds];

      // Both deletes have to happen together, otherwise the board is left either with
      // items that have no position or with sections that lost their content.
      await handleTransactionsAsync(ctx.db, {
        async handleAsync(db, schema) {
          await db.transaction(async (transaction) => {
            if (orphanedItemIds.length > 0) {
              await transaction.delete(schema.items).where(inArray(schema.items.id, orphanedItemIds));
            }
            await transaction.delete(schema.sections).where(inArray(schema.sections.id, sectionIdsToRemove));
          });
        },
        handleSync(db) {
          db.transaction((transaction) => {
            if (orphanedItemIds.length > 0) {
              transaction.delete(items).where(inArray(items.id, orphanedItemIds)).run();
            }
            transaction.delete(sections).where(inArray(sections.id, sectionIdsToRemove)).run();
          });
        },
      });
    }),
  getLayouts: publicProcedure
    .meta({
      openapi: { method: "GET", path: "/api/boards/{id}/layouts", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "List the layouts (responsive breakpoints) of a board with their column counts. REQUIRED: id (board ID)",
      },
    })
    .input(byIdSchema)
    .output(z.array(boardApiLayoutSchema))
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      return await getBoardLayoutsAsync(ctx.db, input.id);
    }),
  getBoardById: publicProcedure
    .meta({
      openapi: { method: "GET", path: "/api/boards/{id}", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Get the full content of a board including layouts, sections and items with their position and size. REQUIRED: id (board ID). Requires view permission",
      },
    })
    .input(byIdSchema)
    .output(boardApiDetailSchema)
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      const board = await getBoardForPlacementAsync(ctx.db, input.id);

      return {
        id: board.id,
        name: board.name,
        isPublic: board.isPublic,
        creatorId: board.creatorId,
        layouts: board.layouts
          .map(({ id, name, columnCount, breakpoint }) => ({ id, name, columnCount, breakpoint }))
          .toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint),
        sections: board.sections.map(mapSectionToApi),
        items: board.items.map(mapItemToApi),
      };
    }),
  exportBoard: publicProcedure
    .meta({
      openapi: { method: "GET", path: "/api/boards/{id}/export", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Export a board as a portable document containing its settings, layouts, sections and items. The result can be fed back into board_importBoard to recreate the board. REQUIRED: id (board ID)",
      },
    })
    .input(byIdSchema)
    .output(boardExportSchema)
    .query(async ({ ctx, input }) => {
      await throwIfActionForbiddenAsync(ctx, eq(boards.id, input.id), "view");

      const board = await getBoardForPlacementAsync(ctx.db, input.id);
      return createBoardExportDocument(board);
    }),
  importBoard: permissionRequiredProcedure
    .requiresPermission("board-create")
    .meta({
      openapi: { method: "POST", path: "/api/boards/import", tags: ["boards"], protect: true },
      mcp: {
        enabled: true,
        description:
          "Create a complete board from a document with layouts, sections and items including their exact position and size. Ids inside the document are local references only and are remapped to freshly generated ids, so the same document can be imported repeatedly. REQUIRED: name, layouts, sections. OPTIONAL: onConflict ('fail' rejects when a board with that name exists, 'skip' keeps the existing board, 'replace' deletes and recreates it). Returns { boardId, created }",
      },
    })
    .input(boardImportSchema)
    .output(z.object({ boardId: z.string(), created: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findBoardByNameAsync(ctx.db, input.name);

      if (!existing) {
        const { boardId } = await insertBoardDocumentAsync(ctx.db, input, ctx.session.user.id);
        return { boardId, created: true };
      }

      if (input.onConflict === "fail") {
        throw new TRPCError({ code: "CONFLICT", message: "Board with similar name already exists" });
      }

      if (input.onConflict === "skip") {
        return { boardId: existing.id, created: false };
      }

      await throwIfActionForbiddenAsync(ctx, eq(boards.id, existing.id), "full");

      // The board keeps its id so that home board settings and per user permissions survive,
      // and the whole exchange happens in one transaction after the document was validated.
      await replaceBoardDocumentAsync(ctx.db, input, { boardId: existing.id, creatorId: ctx.session.user.id });

      return { boardId: existing.id, created: false };
    }),
});

/**
 * Loads a board with everything that is needed to compute the placement of items and sections.
 */
const getBoardForPlacementAsync = async (db: Database, boardId: string) => {
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
    with: {
      sections: { with: { layouts: true } },
      layouts: true,
      items: { with: { layouts: true, integrations: { columns: { integrationId: true } } } },
    },
  });

  if (!board) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
  }

  return board;
};

export type BoardForPlacement = Awaited<ReturnType<typeof getBoardForPlacementAsync>>;

const getBoardLayoutsAsync = async (db: Database, boardId: string) =>
  await db.query.layouts
    .findMany({
      where: eq(layouts.boardId, boardId),
      columns: { id: true, name: true, columnCount: true, breakpoint: true },
    })
    .then((boardLayouts) => boardLayouts.toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint));

/**
 * Explicit layout entries are matched against the layouts of the board, an entry that matches
 * nothing would otherwise be silently dropped and the request would look successful.
 */
const throwIfLayoutsUnknown = (board: BoardForPlacement, requestedLayouts?: { layoutId: string }[]) => {
  const unknown = (requestedLayouts ?? [])
    .map(({ layoutId }) => layoutId)
    .filter((layoutId) => !board.layouts.some((layout) => layout.id === layoutId));

  if (unknown.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Layouts do not belong to this board: ${unknown.join(", ")}`,
    });
  }
};

const hasPlacementChanges = (input: {
  sectionId?: string;
  xOffset?: number;
  yOffset?: number;
  width?: number;
  height?: number;
  layouts?: unknown[];
}) =>
  input.layouts !== undefined ||
  input.sectionId !== undefined ||
  input.xOffset !== undefined ||
  input.yOffset !== undefined ||
  input.width !== undefined ||
  input.height !== undefined;

/** Maps the dynamic section input onto the shared placement shape, where the section is the parent */
const toSectionPlacement = (input: {
  parentSectionId?: string;
  xOffset?: number;
  yOffset?: number;
  width?: number;
  height?: number;
  layouts?: {
    layoutId: string;
    parentSectionId?: string;
    xOffset: number;
    yOffset: number;
    width: number;
    height: number;
  }[];
}) => ({
  sectionId: input.parentSectionId,
  xOffset: input.xOffset,
  yOffset: input.yOffset,
  width: input.width,
  height: input.height,
  layouts: input.layouts?.map(({ parentSectionId, ...layout }) => ({ ...layout, sectionId: parentSectionId })),
});

/** Returns the given section together with every dynamic section that is nested inside of it */
const collectNestedSectionIds = (board: BoardForPlacement, sectionId: string) => {
  const sectionIds = new Set([sectionId]);

  let foundMore = true;
  while (foundMore) {
    foundMore = false;
    for (const section of board.sections) {
      if (sectionIds.has(section.id)) continue;
      if (!section.layouts.some((layout) => layout.parentSectionId && sectionIds.has(layout.parentSectionId))) continue;

      sectionIds.add(section.id);
      foundMore = true;
    }
  }

  return sectionIds;
};

const nextSectionYOffset = (board: BoardForPlacement) =>
  board.sections.reduce((maximum, section) => Math.max(maximum, (section.yOffset ?? 0) + 1), 0);

export const mapItemToApi = (item: BoardForPlacement["items"][number]) => ({
  id: item.id,
  kind: item.kind,
  options: superjson.parse<Record<string, unknown>>(item.options),
  advancedOptions: itemAdvancedOptionsSchema.parse(superjson.parse(item.advancedOptions)),
  integrationIds: item.integrations.map(({ integrationId }) => integrationId),
  layouts: item.layouts.map(({ layoutId, sectionId, xOffset, yOffset, width, height }) => ({
    layoutId,
    sectionId,
    xOffset,
    yOffset,
    width,
    height,
  })),
});

export const mapSectionToApi = (section: BoardForPlacement["sections"][number]) => ({
  id: section.id,
  kind: section.kind,
  name: section.name,
  xOffset: section.xOffset,
  yOffset: section.yOffset,
  options: superjson.parse<Record<string, unknown>>(section.options ?? emptySuperJSON),
  layouts: section.layouts.map(({ layoutId, parentSectionId, xOffset, yOffset, width, height }) => ({
    layoutId,
    parentSectionId,
    xOffset,
    yOffset,
    width,
    height,
  })),
});

/**
 * Get the home board id of the user with the given device type
 * For an example of a user with deviceType = 'mobile' it would go through the following order:
 * 1. user.mobileHomeBoardId
 * 2. user.homeBoardId
 * 3. group.mobileHomeBoardId of the lowest positions group
 * 4. group.homeBoardId of the lowest positions group
 * 5. everyoneGroup.mobileHomeBoardId
 * 6. everyoneGroup.homeBoardId
 * 7. serverSettings.mobileHomeBoardId
 * 8. serverSettings.homeBoardId
 * 9. show NOT_FOUND error
 */
const getHomeIdBoardAsync = async (
  db: Database,
  user: InferSelectModel<typeof users> | null,
  deviceType: DeviceType,
) => {
  const settingKey = deviceType === "mobile" ? "mobileHomeBoardId" : "homeBoardId";

  if (!user) {
    const boardSettings = await getServerSettingByKeyAsync(db, "board");
    return boardSettings[settingKey] ?? boardSettings.homeBoardId;
  }

  if (user[settingKey]) return user[settingKey];
  if (user.homeBoardId) return user.homeBoardId;

  const lowestGroupExceptEveryone = await db
    .select({
      homeBoardId: groups.homeBoardId,
      mobileHomeBoardId: groups.mobileHomeBoardId,
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, user.id),
        not(eq(groups.name, everyoneGroup)),
        not(isNull(groups[settingKey])),
        not(isNull(groups.homeBoardId)),
      ),
    )
    .orderBy(asc(groups.position))
    .limit(1)
    .then((result) => result[0]);

  if (lowestGroupExceptEveryone?.[settingKey]) return lowestGroupExceptEveryone[settingKey];
  if (lowestGroupExceptEveryone?.homeBoardId) return lowestGroupExceptEveryone.homeBoardId;

  const dbEveryoneGroup = await db.query.groups.findFirst({
    where: eq(groups.name, everyoneGroup),
  });

  if (dbEveryoneGroup?.[settingKey]) return dbEveryoneGroup[settingKey];
  if (dbEveryoneGroup?.homeBoardId) return dbEveryoneGroup.homeBoardId;

  const boardSettings = await getServerSettingByKeyAsync(db, "board");
  return boardSettings[settingKey] ?? boardSettings.homeBoardId;
};

const findBoardByNameAsync = async (db: Database, name: string, ignoredIds: string[] = []) => {
  const dbBoards = await db.query.boards.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  return dbBoards.find((board) => board.name.toLowerCase() === name.toLowerCase() && !ignoredIds.includes(board.id));
};

const noBoardWithSimilarNameAsync = async (db: Database, name: string, ignoredIds: string[] = []) => {
  const board = await findBoardByNameAsync(db, name, ignoredIds);

  if (board) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Board with similar name already exists",
    });
  }
};

const getUpdatedBoardLayout = (
  board: Awaited<ReturnType<typeof getFullBoardWithWhereAsync>>,
  options: {
    previous: {
      layoutId: string;
      columnCount: number;
    };
    current: {
      layoutId: string;
      columnCount: number;
    };
  },
) => {
  const itemSectionLayoutsCollection: InferInsertModel<typeof itemLayouts>[] = [];
  const sectionLayoutsCollection: InferInsertModel<typeof sectionLayouts>[] = [];

  const elements = getElementsForLayout(board, options.previous.layoutId);
  const rootSections = board.sections.filter((section) => section.kind !== "dynamic");

  for (const rootSection of rootSections) {
    const result = generateResponsiveGridFor({
      items: elements,
      previousWidth: options.previous.columnCount,
      width: options.current.columnCount,
      sectionId: rootSection.id,
    });

    itemSectionLayoutsCollection.push(
      ...board.items
        .map((item): InferInsertModel<typeof itemLayouts> | null => {
          const currentElement = result.items.find((element) => element.type === "item" && element.id === item.id);

          if (!currentElement) {
            return null;
          }

          return {
            itemId: item.id,
            layoutId: options.current.layoutId,
            sectionId: currentElement.sectionId,
            height: currentElement.height,
            width: currentElement.width,
            xOffset: currentElement.xOffset,
            yOffset: currentElement.yOffset,
          };
        })
        .filter((item) => item !== null),
    );

    sectionLayoutsCollection.push(
      ...board.sections
        .filter((section) => section.kind === "dynamic")
        .map((section): InferInsertModel<typeof sectionLayouts> | null => {
          const currentElement = result.items.find(
            (element) => element.type === "section" && element.id === section.id,
          );

          if (!currentElement) {
            return null;
          }

          return {
            layoutId: options.current.layoutId,
            sectionId: section.id,
            parentSectionId: currentElement.sectionId,
            height: currentElement.height,
            width: currentElement.width,
            xOffset: currentElement.xOffset,
            yOffset: currentElement.yOffset,
          };
        })
        .filter((section) => section !== null),
    );
  }

  return {
    itemSectionLayouts: itemSectionLayoutsCollection,
    sectionLayouts: sectionLayoutsCollection,
  };
};

const getElementsForLayout = (board: Awaited<ReturnType<typeof getFullBoardWithWhereAsync>>, layoutId: string) => {
  const sectionElements = board.sections
    .filter((section) => section.kind === "dynamic")
    .map((section) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const clonedLayout = section.layouts.find((sectionLayout) => sectionLayout.layoutId === layoutId)!;

      return {
        id: section.id,
        type: "section" as const,
        height: clonedLayout.height,
        width: clonedLayout.width,
        xOffset: clonedLayout.xOffset,
        yOffset: clonedLayout.yOffset,
        sectionId: clonedLayout.parentSectionId,
      };
    });

  const itemElements = board.items.map((item) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const clonedLayout = item.layouts.find((itemLayout) => itemLayout.layoutId === layoutId)!;

    return {
      id: item.id,
      type: "item" as const,
      height: clonedLayout.height,
      width: clonedLayout.width,
      xOffset: clonedLayout.xOffset,
      yOffset: clonedLayout.yOffset,
      sectionId: clonedLayout.sectionId,
    };
  });

  return [...itemElements, ...sectionElements];
};

const getFullBoardWithWhereAsync = async (db: Database, where: SQL<unknown>, userId: string | null) => {
  const groupPermissionWhere = userId
    ? inArray(
        boardGroupPermissions.groupId,
        db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, userId)),
      )
    : eq(boardGroupPermissions.groupId, "");
  const board = await db.query.boards.findFirst({
    where,
    with: {
      creator: {
        columns: {
          id: true,
          name: true,
          image: true,
          email: true,
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
            columns: {
              integrationId: true,
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
        where: groupPermissionWhere,
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
      .toSorted((layoutA, layoutB) => layoutA.breakpoint - layoutB.breakpoint),
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
    items: items
      .map(({ integrations: itemIntegrations, ...item }) =>
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
          integrationIds: itemIntegrations.map((item) => item.integrationId),
          advancedOptions: superjson.parse<BoardItemAdvancedOptions>(item.advancedOptions),
          options: superjson.parse<Record<string, unknown>>(item.options),
        }),
      )
      .filter((item): item is NonNullable<typeof item> => item !== null),
  };
};

const forKind = <T extends WidgetKind>(kind: T) =>
  z.object({
    kind: z.literal(kind),
    options: z.record(z.string(), z.unknown()),
  });

const outputItemSchema = zodUnionFromArray(widgetKinds.map((kind) => forKind(kind))).and(sharedItemSchema);

const boardLogger = createLogger({ module: "board" });

const parseItem = (item: unknown) => {
  const result = outputItemSchema.safeParse(item);

  if (!result.success) {
    boardLogger.warn("Failed to parse board item, skipping", { error: result.error.message });
    return null;
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

const filterAddedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  inputArray.filter((inputItem) => !dbArray.some((dbItem) => dbItem.id === inputItem.id));

const filterRemovedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  dbArray.filter((dbItem) => !inputArray.some((inputItem) => dbItem.id === inputItem.id));

const filterUpdatedItems = <TInput extends { id: string }>(inputArray: TInput[], dbArray: TInput[]) =>
  inputArray.filter((inputItem) => dbArray.some((dbItem) => dbItem.id === inputItem.id));
